const fs = require('fs');

// รันอัตโนมัติ (schedule) ส่งเฉพาะวันสุดท้ายของเดือน / กดรันเองส่งได้ทุกวัน
if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  if (t.getDate() !== 1) {
    console.log('ยังไม่ใช่วันสุดท้ายของเดือน ข้ามไปก่อน');
    process.exit(0);
  }
}

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const items = data.items || [];
const unpaid = items.filter(i => !i.paid);
const paidCount = items.length - unpaid.length;

const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const now = new Date();
const monthLabel = thMonths[now.getMonth()] + ' ' + (now.getFullYear() + 543);

const baht = n => '฿' + (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const remain = unpaid.reduce((s, i) => s + Number(i.amount || 0), 0);

const [owner, repo] = (process.env.GITHUB_REPOSITORY || '/').split('/');
const appUrl = `https://${owner.toLowerCase()}.github.io/${repo}/`;

const body = [
  { type: 'text', text: monthLabel, size: 'sm', color: '#84898F' },
  { type: 'text', text: baht(remain), size: 'xxl', weight: 'bold', margin: 'sm' },
  { type: 'text', text: unpaid.length ? 'ยอดที่ยังต้องจ่าย' : 'จ่ายครบทุกรายการแล้ว 🎉', size: 'xs', color: '#84898F' },
  { type: 'text', text: `จ่ายแล้ว ${paidCount}/${items.length} รายการ`, size: 'xs', color: '#84898F' },
];

const groups = {};
unpaid.forEach(i => { (groups[i.group || 'ทั่วไป'] = groups[i.group || 'ทั่วไป'] || []).push(i); });

if (unpaid.length) body.push({ type: 'separator', margin: 'lg' });

Object.keys(groups).forEach(g => {
  const list = groups[g];
  const subtotal = list.reduce((s, i) => s + Number(i.amount || 0), 0);
  body.push({
    type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
    contents: [
      { type: 'box', layout: 'baseline', contents: [
        { type: 'text', text: g, weight: 'bold', size: 'sm', flex: 1 },
        { type: 'text', text: baht(subtotal), size: 'xs', color: '#3D6AF2', align: 'end' },
      ]},
      ...list.map(i => ({
        type: 'box', layout: 'baseline', contents: [
          { type: 'text', text: i.name + (i.total ? ` (${i.current || 0}/${i.total})` : ''), size: 'xs', color: '#5B6355', flex: 3, wrap: true },
          { type: 'text', text: baht(i.amount), size: 'xs', align: 'end', flex: 2 },
        ],
      })),
    ],
  });
});

const message = {
  type: 'flex',
  altText: `บิลเดือน ${monthLabel} ที่ยังต้องจ่าย ${baht(remain)}`,
  contents: {
    type: 'bubble',
    body: { type: 'box', layout: 'vertical', contents: body },
    footer: {
      type: 'box', layout: 'vertical',
      contents: [{
        type: 'button', style: 'primary', color: '#3D6AF2',
        action: { type: 'uri', label: 'เปิดสมุดบัญชี', uri: appUrl },
      }],
    },
  },
};

fetch('https://api.line.me/v2/bot/message/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.LINE_TOKEN,
  },
  body: JSON.stringify({ to: process.env.LINE_USER_ID, messages: [message] }),
}).then(async res => {
  if (!res.ok) {
    console.error('LINE API error:', res.status, await res.text());
    process.exit(1);
  }
  console.log('ส่งสำเร็จ ✅');
});
