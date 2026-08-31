export default function handler(_req, res) {
  return res.status(200).json({ ok: true, service: "Minha Rede Saúde", time: new Date().toISOString() });
}
