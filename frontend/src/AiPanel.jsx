import React, { useEffect, useState } from 'react';
import { backend } from './backend-client';

const QUICK = [
  'Tóm tắt những ý chính của tài liệu này.',
  'Liệt kê các thông số kỹ thuật, tiêu chuẩn và số liệu quan trọng.',
  'Lập dàn ý theo chương/mục.',
  'Giải thích các thuật ngữ chuyên môn khó.',
];

export default function AiPanel({ selected, busy, setBusy }) {
  const [cfg, setCfg] = useState(null);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [question, setQuestion] = useState(QUICK[0]);
  const [answer, setAnswer] = useState('');
  const [msg, setMsg] = useState('');
  const [mq, setMq] = useState('');
  const apply = (c, p = provider) => { setCfg(c); setModel(c.providers[p].model); };
  useEffect(() => {
    backend('aiConfig').then((c) => { setProvider(c.provider); apply(c, c.provider); }).catch((e) => setMsg(e.message));
  }, []);
  if (!cfg) return <p className="ai-msg">{msg || 'Đang tải cấu hình AI…'}</p>;
  const P = cfg.providers[provider];
  const choose = (p) => { setProvider(p); setModel(cfg.providers[p].model); setKey(''); setMsg(''); setMq(''); };
  const norm = (x) => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const shown = P.models.filter((m) => !mq || norm(m.label + ' ' + m.id).includes(norm(mq)));
  const current = P.models.find((m) => m.id === model);
  const act = async (fn, ok) => {
    setBusy(true); setMsg('');
    try { const r = await fn(); if (ok) setMsg(ok); return r; } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="ai-panel">
      <div className="ai-providers" role="tablist">
        {Object.entries(cfg.providers).map(([id, p]) => (
          <button key={id} type="button" role="tab" aria-selected={id === provider} className={id === provider ? 'active' : ''} onClick={() => choose(id)}>
            {p.name}{!p.local && <i className={p.hasKey ? 'dot on' : 'dot'} title={p.hasKey ? 'Đã có API key' : 'Chưa có API key'} />}
          </button>
        ))}
      </div>
      {!P.local ? (
        <div className="ai-key">
          <label>
            API key {P.name} {P.hasKey && <small>(đã lưu, mã hóa trên máy)</small>}
            <input type="password" autoComplete="off" value={key} placeholder={P.hasKey ? '•••••••• (nhập để thay key mới)' : 'Dán API key vào đây'} onChange={(e) => setKey(e.target.value)} maxLength={400} />
          </label>
          <button type="button" disabled={busy || !key.trim()} onClick={() => act(async () => { apply(await backend('aiSave', { provider, key, model })); setKey(''); }, 'Đã lưu API key.')}>Lưu key</button>
          {P.hasKey && <button type="button" disabled={busy} onClick={() => act(async () => apply(await backend('aiSave', { provider, clearKey: true })), 'Đã xóa API key.')}>Xóa key</button>}
          <small className="ai-hint">Lấy key tại: {P.keyUrl}</small>
        </div>
      ) : (
        <p className="ai-hint">Chạy hoàn toàn trên máy qua Ollama (127.0.0.1:11434). Cần cài Ollama và tải model trước. Gửi tối đa 24.000 ký tự đầu tài liệu.</p>
      )}
      <div className="ai-model">
        <label>
          Model đang dùng {current && <small>({current.label})</small>}
          <input value={model} onChange={(e) => setModel(e.target.value)} maxLength={160} required placeholder="Chọn bên dưới hoặc gõ ID model" />
        </label>
        <button type="button" disabled={busy || (!P.local && !P.hasKey && provider !== 'openrouter')} title="Lấy danh sách model mới nhất từ nhà cung cấp" onClick={() => act(async () => { const c = await backend('aiModels', { provider }); setCfg(c); return c; }, 'Đã cập nhật danh sách model từ ' + P.name + '.')}>Tải danh sách model</button>
      </div>
      <div className="ai-model-pick">
        <input type="search" value={mq} onChange={(e) => setMq(e.target.value)} placeholder={'Tìm trong ' + P.models.length + ' model của ' + P.name + '…'} aria-label="Tìm model" />
        <div className="ai-model-list" role="listbox" aria-label="Danh sách model">
          {shown.map((m) => (
            <button
              type="button"
              role="option"
              key={m.id}
              aria-selected={m.id === model}
              className={m.id === model ? 'active' : ''}
              title={m.id}
              onClick={() => { setModel(m.id); backend('aiSave', { provider, model: m.id }).then(setCfg).catch(() => {}); }}
            >
              <b>{m.label}</b>
              <small>{m.id}</small>
            </button>
          ))}
          {!shown.length && <p className="ai-hint">Không có model khớp. Có thể gõ thẳng ID model ở ô trên.</p>}
        </div>
      </div>
      <div className="ai-quick">{QUICK.map((q) => <button type="button" key={q} className={q === question ? 'active' : ''} onClick={() => setQuestion(q)}>{q}</button>)}</div>
      <form onSubmit={(e) => {
        e.preventDefault();
        setAnswer('');
        act(async () => {
          const r = await backend('aiAsk', { provider, model: model.trim(), id: selected.id, question });
          setAnswer(r.answer + '\n\n— ' + r.source + (r.limited ? ' (chỉ dùng đoạn đầu tài liệu)' : ''));
        });
      }}>
        <label>
          Câu hỏi
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} required maxLength={4000} />
        </label>
        <button className="primary" disabled={busy || !selected?.imported || !model.trim() || (!P.local && !P.hasKey)}>
          {busy ? 'Đang xử lý…' : 'Hỏi ' + P.name}
        </button>
        {!P.local && <small className="ai-hint">Nội dung văn bản của tài liệu (tối đa 120.000 ký tự) sẽ được gửi tới {P.name}.</small>}
      </form>
      {msg && <p className="ai-msg">{msg}</p>}
      {answer && <pre className="ai-answer">{answer}</pre>}
    </div>
  );
}
