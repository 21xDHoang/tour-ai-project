# -*- coding: utf-8 -*-
"""
app/ai/adapter.py - Điểm truy cập duy nhất tới nhà cung cấp AI.

Hỗ trợ 2 provider (chọn qua settings.AI_PROVIDER):
  - "gemini"  : Google Gemini (structured JSON output qua response_schema).
  - "deepseek": DeepSeek API (OpenAI-compatible, JSON mode qua response_format).

Mọi module AI đều đi qua AIServiceAdapter, ép đầu ra JSON có cấu trúc và ném
AIUnavailableError khi lỗi để Service chuyển sang phương án Fallback.
"""
import json
import logging

import httpx
import google.generativeai as genai
from google.api_core import exceptions as api_exc

from app.config import settings

logger = logging.getLogger("ai")
genai.configure(api_key=settings.GEMINI_API_KEY)


class AIUnavailableError(Exception):
    """AI không khả dụng - Service sẽ chuyển sang phương án Fallback."""


# Các trường JSON Schema mà Google Schema proto (response_schema) hỗ trợ.
# Pydantic model_json_schema() bổ sung title/$defs/minimum/maxItems... mà proto
# KHÔNG nhận -> phải lọc bỏ hoặc đổi tên trước khi gửi (nếu không
# ValueError "Unknown field for Schema").
_GEMINI_SCHEMA_FIELDS = {
    "type", "format", "description", "nullable", "enum",
    "items", "properties", "required", "max_items", "min_items",
}
# Pydantic dùng camelCase (maxItems) nhưng descriptor proto dùng snake_case
# (max_items) -> đổi tên cho khớp.
_GEMINI_SCHEMA_RENAME = {"maxItems": "max_items", "minItems": "min_items"}


def _to_gemini_schema(schema, defs: dict) -> dict:
    """Chuyển JSON Schema (Pydantic) thành schema tương thích Gemini.

    - Loại bỏ trường Pydantic thừa mà proto không nhận (title, default,
      $defs, minimum, maximum, anyOf, additionalProperties...).
    - Đổi tên giới hạn mảng maxItems/minItems -> max_items/min_items.
    - "Giải tham chiếu" $ref/#/$defs/... cho model lồng nhau
      (vd DeXuatResponse chứa DeXuatItem).
    """
    if isinstance(schema, list):
        return [_to_gemini_schema(s, defs) for s in schema]
    if not isinstance(schema, dict):
        return schema

    if "$ref" in schema:
        name = schema["$ref"].rsplit("/", 1)[-1]
        if name in defs:
            return _to_gemini_schema(defs[name], defs)
        return schema

    out: dict = {}
    for k, v in schema.items():
        gk = _GEMINI_SCHEMA_RENAME.get(k, k)
        if gk == "properties" and isinstance(v, dict):
            out["properties"] = {
                kk: _to_gemini_schema(vv, defs) for kk, vv in v.items()
            }
        elif gk == "items":
            out["items"] = _to_gemini_schema(v, defs)
        elif gk in _GEMINI_SCHEMA_FIELDS:
            out[gk] = v
    return out


class AIServiceAdapter:
    """Gọi AI (Gemini hoặc DeepSeek) với đầu ra JSON có cấu trúc."""

    def __init__(self, model: str | None = None):
        self.provider = settings.AI_PROVIDER  # "gemini" | "deepseek"
        self.model_name = model or (
            settings.DEEPSEEK_MODEL if self.provider == "deepseek"
            else settings.GEMINI_MODEL
        )
        self._gemini_model = None
        if self.provider == "gemini":
            self._gemini_model = genai.GenerativeModel(self.model_name)

    def generate(
        self,
        prompt: str,
        schema: dict,
        temperature: float = 0.3,
        timeout: int | None = None,
    ) -> dict:
        """Sinh JSON theo schema; ném AIUnavailableError nếu lỗi."""
        if self.provider == "deepseek":
            return self._generate_deepseek(prompt, schema, temperature, timeout)
        return self._generate_gemini(prompt, schema, temperature, timeout)

    def _generate_gemini(self, prompt, schema, temperature, timeout) -> dict:
        """Gọi Google Gemini với Structured JSON Outputs (response_schema)."""
        gemini_schema = _to_gemini_schema(schema, schema.get("$defs", {}))
        config = genai.GenerationConfig(
            response_mime_type="application/json",  # ép đầu ra là JSON
            response_schema=gemini_schema,           # schema tương thích Gemini
            temperature=temperature,
        )
        try:
            resp = self._gemini_model.generate_content(
                prompt,
                generation_config=config,
                request_options={"timeout": timeout or settings.GEMINI_TIMEOUT},
            )
            return json.loads(resp.text)
        except (api_exc.GoogleAPIError, api_exc.RetryError,
                api_exc.DeadlineExceeded, json.JSONDecodeError) as exc:
            logger.warning("Gemini API lỗi: %s", exc)
            raise AIUnavailableError(str(exc)) from exc

    def _generate_deepseek(self, prompt, schema, temperature, timeout) -> dict:
        """Gọi DeepSeek (OpenAI-compatible) với chế độ JSON object.

        DeepSeek không có response_schema native -> nhúng schema vào prompt và
        dùng response_format={"type": "json_object"}; kết quả được service
        validate lại bằng Pydantic (sai thì fallback).
        """
        # Dùng schema đã "giải tham chiếu" $defs/$ref (nested) để DeepSeek trả
        # đúng cấu trúc lồng nhau (vd DeXuatResponse.danh_sach).
        schema_str = json.dumps(
            _to_gemini_schema(schema, schema.get("$defs", {})),
            ensure_ascii=False,
        )
        full_prompt = (
            f"{prompt}\n\n"
            "Chỉ trả về DUY NHẤT một đối tượng JSON (không thêm văn bản ngoài "
            f"JSON) khớp đúng cấu trúc sau:\n{schema_str}\n"
            "Mỗi trường phải chứa GIÁ TRỊ trả lời thật (mã số/tên thật từ dữ "
            "liệu bên trên, nội dung tiếng Việt ngắn gọn). TUYỆT ĐỐI không đưa "
            "định nghĩa trường, khóa 'description'/'properties' hay nội dung "
            "của lược đồ vào làm giá trị trả về."
        )
        try:
            resp = httpx.post(
                settings.DEEPSEEK_BASE_URL + "/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": full_prompt}],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 2048,
                    "temperature": temperature,
                },
                timeout=timeout or settings.GEMINI_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except (httpx.HTTPError, KeyError, IndexError,
                json.JSONDecodeError) as exc:
            logger.warning("DeepSeek API lỗi: %s", exc)
            raise AIUnavailableError(str(exc)) from exc
