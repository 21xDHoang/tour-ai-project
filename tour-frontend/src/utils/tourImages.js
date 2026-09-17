/**
 * Kho ảnh điểm đến — lưu trên Cloudflare R2 của dự án.
 *
 * Ảnh nằm trong bucket R2 chứ không hotlink từ Unsplash CDN: không phụ thuộc
 * dịch vụ bên ngoài, không sợ ảnh nguồn bị xoá hay đổi, và tải nhanh hơn.
 * Nạp lại kho ảnh bằng: tour-backend/scripts/upload_destination_images.py
 *
 * Mọi ảnh đã được tải về và kiểm tra bằng mắt trước khi đưa vào. Bản cũ của
 * tệp này gán ảnh theo cảm giác: Hà Giang là núi tuyết Alaska, Sa Pa là đền
 * Bali, Hội An là đĩa thịt nướng, Huế là skyline Sài Gòn, Cát Bà là đền Ulun
 * Danu, và ảnh dự phòng cho tour văn hoá là một thị trấn Đức. Khách nhìn ra
 * ngay, nên phần này được làm lại từ đầu.
 *
 * Cách chọn ảnh: đúng vùng miền và đúng thứ khách sẽ thấy trên cung đường —
 * đèo Hà Giang, ruộng bậc thang Sa Pa, thuyền nan Tràng An, phố đèn lồng
 * Hội An, Cầu Vàng Bà Nà, chùa Thiên Mụ, cửa động Phong Nha.
 */

import { normalizeVi } from './format';

const CDN = 'https://pub-c40106afa06341f8bea4b9a758d01773.r2.dev/destinations';

/** Dựng URL ảnh trên R2. */
const img = (name) => `${CDN}/${name}.jpg`;

// Giữ thành hằng số để một ảnh có thể dùng ở nhiều nhóm mà không phải
// chép lại chuỗi.
const IMG = {
  haLong: img('ha-long'),

  haGiangValley: img('ha-giang-3'),
  haGiangPass: img('ha-giang-1'),
  haGiangRide: img('ha-giang-2'),
  haGiangGold: img('ha-giang-4'),

  sapaTerrace: img('sa-pa-1'),
  sapaVillage: img('sa-pa-2'),

  ninhBinhTrangAn: img('ninh-binh-2'),
  ninhBinhHangMua: img('ninh-binh-1'),

  hoiAnNight: img('hoi-an-1'),
  hoiAnLantern: img('hoi-an-2'),

  daNangGoldenBridge: img('da-nang'),

  phuQuocBeach: img('phu-quoc-1'),
  phuQuocAerial: img('phu-quoc-2'),

  daLatPine: img('da-lat'),

  hueThienMu: img('hue'),

  phongNhaCave: img('phong-nha'),

  // Hai ảnh dưới chưa xác minh được địa điểm cụ thể, nhưng không lộ dấu hiệu
  // nước ngoài: một bãi biển nhiệt đới chung và một bãi biển chụp từ trên cao
  // có thuyền thúng — chấp nhận được cho thành phố biển.
  nhaTrangBeach: img('nha-trang'),
  quyNhonAerial: img('quy-nhon'),
};

/**
 * Ảnh đại diện cho từng điểm đến — dùng cho lưới "Điểm đến" ở trang chủ và
 * ảnh nền trang đăng nhập. Mỗi khoá là một chuỗi, không phải mảng.
 */
export const DESTINATION_IMAGES = {
  'ha-long': IMG.haLong,
  'ha-giang': IMG.haGiangPass,
  'sa-pa': IMG.sapaTerrace,
  'ninh-binh': IMG.ninhBinhHangMua,
  'da-nang': IMG.daNangGoldenBridge,
  'hoi-an': IMG.hoiAnNight,
  'phu-quoc': IMG.phuQuocBeach,
  'da-lat': IMG.daLatPine,
  'hue': IMG.hueThienMu,
  'phong-nha': IMG.phongNhaCave,
  'nha-trang': IMG.nhaTrangBeach,
  'quy-nhon': IMG.quyNhonAerial,

  // Cát Bà / vịnh Lan Hạ là karst đá vôi trên mặt nước — cùng địa hình với
  // Tràng An, nên dùng tạm ảnh Tràng An thay vì đền Bali như bản cũ.
  'cat-ba': IMG.ninhBinhTrangAn,

  // Côn Đảo là đảo rừng nhiệt đới giữa biển xanh — ảnh đảo chụp từ trên cao
  // sát nghĩa hơn hẳn bãi biển chung chung mà bản cũ dùng (trùng với Nha Trang).
  'con-dao': IMG.phuQuocAerial,

  'default-trai-nghiem': IMG.haGiangGold,
  'default-nghi-duong': IMG.phuQuocAerial,
  'default-van-hoa': IMG.hoiAnLantern,
};

/**
 * Bộ ảnh dự phòng theo điểm đến.
 *
 * Danh mục có 4 tour Hà Giang — nếu tất cả cùng trả về một ảnh thì lưới tour
 * trông như bị lặp. `getTourImage` xoay vòng trong bộ này theo mã tour để mỗi
 * thẻ một khác, vẫn đúng địa danh.
 */
const DESTINATION_SETS = {
  'ha-giang': [IMG.haGiangPass, IMG.haGiangRide, IMG.haGiangValley, IMG.haGiangGold],
  'sa-pa': [IMG.sapaTerrace, IMG.sapaVillage],
  'ninh-binh': [IMG.ninhBinhHangMua, IMG.ninhBinhTrangAn],
  'hoi-an': [IMG.hoiAnNight, IMG.hoiAnLantern],
  'phu-quoc': [IMG.phuQuocBeach, IMG.phuQuocAerial],
};

/**
 * Từ khoá nhận diện điểm đến, đã bỏ dấu.
 *
 * So khớp theo ranh giới từ chứ không phải `includes`: bỏ dấu xong thì "thuê xe"
 * thành "thue xe" và chứa "hue", nên so khớp thô sẽ biến mọi tour có thuê xe
 * thành tour Huế.
 */
const DESTINATION_KEYWORDS = [
  ['ha-long', ['ha long', 'halong', 'lan ha']],
  ['phu-quoc', ['phu quoc', 'dao ngoc']],
  ['da-nang', ['da nang', 'ba na']],
  ['sa-pa', ['sa pa', 'sapa', 'fansipan']],
  ['nha-trang', ['nha trang', 'vinpearl']],
  ['hoi-an', ['hoi an', 'pho co']],
  ['ninh-binh', ['ninh binh', 'trang an', 'tam coc']],
  ['da-lat', ['da lat', 'ngan hoa']],
  ['ha-giang', ['ha giang', 'ma pi leng', 'dong van', 'meo vac']],
  ['quy-nhon', ['quy nhon', 'ky co']],
  ['hue', ['hue', 'co do']],
  ['phong-nha', ['phong nha', 'ke bang', 'quang binh']],
  ['con-dao', ['con dao']],
  ['cat-ba', ['cat ba']],
];

/** Một từ khoá khớp khi đứng trọn vẹn trong chuỗi, không dính vào từ khác. */
const matchesKeyword = (text, kw) =>
  new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`).test(text);

/**
 * Trả về link ảnh phù hợp nhất theo tên tour hoặc tên điểm đến.
 */
export function getTourImage(tour) {
  if (!tour) return DESTINATION_IMAGES['default-trai-nghiem'];

  // Nếu trong dữ liệu tour đã có URL ảnh hợp lệ
  if (tour.HinhAnh && typeof tour.HinhAnh === 'string' && tour.HinhAnh.startsWith('http')) {
    return tour.HinhAnh;
  }

  const text = normalizeVi(
    `${tour.TenTour || ''} ${tour.ten_diem_den || ''} ${tour.MoTa || ''}`
  );

  for (const [key, keywords] of DESTINATION_KEYWORDS) {
    if (keywords.some((kw) => matchesKeyword(text, kw))) {
      const set = DESTINATION_SETS[key] || [DESTINATION_IMAGES[key]];
      return set[Math.abs(tour.MaTour || 0) % set.length];
    }
  }

  // Phân theo loại tour
  if (tour.LoaiTour === 'NghiDuong') {
    return DESTINATION_IMAGES['default-nghi-duong'];
  }
  if (tour.LoaiTour === 'VanHoaLichSu') {
    return DESTINATION_IMAGES['default-van-hoa'];
  }

  // Mặc định xoay vòng theo mã tour
  const list = Object.values(DESTINATION_IMAGES);
  return list[(tour.MaTour || 0) % list.length];
}
