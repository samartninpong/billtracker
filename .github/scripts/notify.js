const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const items = data.items || [];
const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const now = new Date();
const monthLabel = thMonths[now.getMonth()] + ' ' + (now.getFullYear() + 543);

function baht(n) {
  return '฿' + (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

const groups = {};
items.forEach(i => {
  const g = i.group || 'ทั่วไป';
  (groups[g] = groups[g] || []).push(i);
});

const bodyContents = [
  { type: 'text', text: monthLabel, size: 'sm', color: '#84898F' },
  { type: 'text', text: baht(total), size: 'xxl', weight: 'bold', margin: 'sm' },
  { type: 'text', text: 'ยอดรวมที่ต้องจ่ายเดือนนี้', size: 'xs', color: '#84898F' },
  { type: 'separator', margin: 'lg' },
];

Object.keys(groups).forEach(g => {
  const list = groups[g];
  const subtotal = list.reduce((s, i) => s + Number(i.amount || 0), 0);
  bodyContents.push({
    type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
    contents: [
      { type: 'box', layout: 'baseline', contents: [
        { type: 'text', text: g, weight: 'bold', size: 'sm', flex: 1 },
        { type: 'text', text: baht(subtotal), size: 'xs', color: '#3D6AF2', align: 'end' },
      ]},
      ...list.map(i => ({
        type: 'box', layout: 'baseline', contents: [
          { type: 'text', text: i.name + (i.total ? ` (${i.current||0}/${i.total})` : ''), size: 'xs', color: '#5B6355', flex: 3 },
          { type: 'text', text: baht(i.amount), size: 'xs', align: 'end', flex: 1 },
        ]
      }))
    ]
  });
});

const flexMessage = {
  type: 'flex',
  altText: 'สรุปบิลเดือน ' + monthLabel + ' รวม ' + baht(total),
  contents: {
    type: 'bubble',
    body: { type: 'box', layout: 'vertical', contents: bodyContents }
  }
};

fetch('https://api.line.me/v2/bot/message/push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.LINE_TOKEN,
  },
  body: JSON.stringify({ to: process.env.LINE_USER_ID, messages: [flexMessage] }),
}).then(async res => {
  if (!res.ok) {
    console.error('LINE API error:', res.status, await res.text());
    process.exit(1);
  }
  console.log('ส่งสำเร็จ ✅');
});
