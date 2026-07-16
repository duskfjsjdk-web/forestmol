const key = '6N7vcV4f3hQAWIbV7WlZrWpWAFw9aDFM3pFyL2QJKq8=';
const url = `http://plus.kipris.or.kr/openapi/rest/searchservice/search?ServiceKey=${encodeURIComponent(key)}&word=${encodeURIComponent('소나무')}&numOfRows=5&pageNo=1&type=patent`;
fetch(url).then(r => r.text()).then(t => console.log(t.substring(0, 1500))).catch(console.error);
