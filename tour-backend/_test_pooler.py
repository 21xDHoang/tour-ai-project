# -*- coding: utf-8 -*-
"""Thử kết nối tới Supabase qua pooler các region (không in password)."""
import os, re, time
import psycopg2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env = {}
with open(os.path.join(BASE_DIR, ".env"), encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
        if m:
            env[m.group(1)] = m.group(2)

url = env.get("DATABASE_URL", "")
m = re.match(r"^postgresql\+psycopg2://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)(\?.*)?$", url)
if not m:
    print("KHONG parse duoc DATABASE_URL")
    raise SystemExit(1)
user = m.group(1)      # postgres
password = m.group(2)
dbname = m.group(5)

ref = "eoavhgajqthrqtjqzwbr"
regions = ["ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
           "us-east-1", "us-east-2", "eu-west-1", "eu-central-1"]

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    conn_user = f"{user}.{ref}"
    ok = False
    try:
        conn = psycopg2.connect(
            host=host, port=5432, user=conn_user, password=password,
            dbname=dbname, connect_timeout=6)
        ok = True
        try:
            cur = conn.cursor()
            cur.execute("SELECT version()")
            ver = cur.fetchone()[0]
            print(f"[PASS 5432] {region}  -> {ver[:60]}...")
        except Exception as e:
            print(f"[PASS 5432] {region}  (khong select duoc: {e})")
        finally:
            conn.close()
    except Exception as e:
        err = str(e).split("\n")[0][:90]
        print(f"[FAIL 5432] {region}  -> {err}")

# Thử transaction pooler (6543) cho region ap-southeast-1
host = "aws-0-ap-southeast-1.pooler.supabase.com"
try:
    conn = psycopg2.connect(
        host=host, port=6543, user=f"{user}.{ref}", password=password,
        dbname=dbname, connect_timeout=6, options="-c statement_timeout=5000")
    print(f"[PASS 6543] ap-southeast-1 (transaction pooler)")
    conn.close()
except Exception as e:
    err = str(e).split("\n")[0][:90]
    print(f"[FAIL 6543] ap-southeast-1 -> {err}")
