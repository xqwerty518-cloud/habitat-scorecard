// 에코뱅크(국립생태원) 오픈API 프록시.
// 인증키는 Vercel 환경 변수 ECOBANK_API_KEY에만 있고 브라우저로 내보내지 않는다.
// 허용된 레이어·요청 종류·파라미터만 받아 그대로 전달한다 (임의 URL 호출 불가).
//
// 예: /api/ecobank?layer=mml&kind=attr&ctprvnCd=42&numOfRows=20
//     /api/ecobank?layer=birds&kind=wfs&bbox=190000,440000,200000,450000&maxFeatures=50

const BASE = 'https://www.nie-ecobank.kr/ecoapi/NteeInfoService';

// 자연환경조사 점 레이어 (가이드: nie-ecobank.kr/data/api/intrcn.do)
const LAYERS = {
  mml:    { name: 'Mml',    typeName: 'mv_map_ntee_mml_point' },    // 포유류
  birds:  { name: 'Birds',  typeName: 'mv_map_ntee_birds_point' },  // 조류
  amnrp:  { name: 'Amnrp',  typeName: 'mv_map_ntee_amnrp_point' },  // 양서파충류
  fishes: { name: 'Fishes', typeName: 'mv_map_ntee_fishes_point' }, // 어류
};

const intIn = (v, lo, hi) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

function buildUrl(q, key) {
  const layer = LAYERS[q.layer];
  if (!layer) return { error: 'layer는 ' + Object.keys(LAYERS).join(', ') + ' 중 하나여야 합니다' };
  const kind = q.kind === 'wfs' ? 'wfs' : 'attr';
  const params = new URLSearchParams();

  if (kind === 'attr') {
    params.set('type', 'json');
    params.set('pageNo', String(intIn(q.pageNo, 1, 10000) || 1));
    params.set('numOfRows', String(intIn(q.numOfRows, 1, 100) || 20));
    // 행정구역 코드: 시도 2자리, 시군구 5자리, 읍면동 8자리 숫자만
    if (/^\d{2}$/.test(q.ctprvnCd || '')) params.set('ctprvnCd', q.ctprvnCd);
    if (/^\d{5}$/.test(q.signguCd || '')) params.set('signguCd', q.signguCd);
    if (/^\d{8}$/.test(q.emdCd || '')) params.set('emdCd', q.emdCd);
  } else {
    params.set('typeName', layer.typeName);
    params.set('maxFeatures', String(intIn(q.maxFeatures, 1, 500) || 50));
    if (q.bbox) {
      const parts = String(q.bbox).split(',').map(Number);
      if (parts.length !== 4 || !parts.every(Number.isFinite)) return { error: 'bbox는 숫자 4개(좌하x,좌하y,우상x,우상y)여야 합니다' };
      params.set('bbox', parts.join(','));
    }
  }
  // 공공데이터 키는 이미 URL 인코딩된 형태(%2B 등)로 발급되기도 하므로 두 번 인코딩하지 않는다
  const serviceKey = /%[0-9A-Fa-f]{2}/.test(key) ? key : encodeURIComponent(key);
  return { url: `${BASE}/${kind}/get${layer.name}Point${kind === 'wfs' ? 'WFS' : 'Attr'}?serviceKey=${serviceKey}&${params}` };
}

module.exports = async function handler(req, res) {
  const key = process.env.ECOBANK_API_KEY;
  if (!key) return res.status(500).json({ error: '서버에 ECOBANK_API_KEY가 설정되지 않았습니다' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET만 허용됩니다' });

  const { url, error } = buildUrl(req.query || {}, key);
  if (error) return res.status(400).json({ error });

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await upstream.text();
    // 업스트림 오류 메시지에 키가 섞여 돌아오는 경우를 막는다
    const safe = text.split(key).join('[KEY]').split(encodeURIComponent(key)).join('[KEY]');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/plain; charset=utf-8');
    // 같은 요청은 Vercel 엣지에서 하루 캐시 (키 사용량·응답 속도)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(upstream.status).send(safe);
  } catch (e) {
    return res.status(502).json({ error: '에코뱅크 응답 실패', detail: String(e && e.name || e) });
  }
};
