async function test() {
  const res = await fetch('http://localhost:3000/api/search?query=%ED%8E%B8%EB%B0%B1');
  const data = await res.json();
  if (data.results) {
    data.results.forEach((x: any, i: number) => {
      console.log(`${i+1}위: ${x.name_ko || x.name} (${x.data_source}) - 유사도: ${x.similarity}`);
    });
  } else {
    console.log(data);
  }
}
test();
