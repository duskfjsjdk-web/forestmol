import { parseBioactivityTags } from '../src/utils/parseBioactivity';

const pinusBioactivity = [
  "간질, 감기, 강장보호, 건비, 고혈압, 골절번통, 관절염, 기관지염, 당뇨병, 두현, 변비, 식풍, 신허, 양음, 오로보호, 윤장, 윤폐, 이명, 임신중독증, 자양강장, 정력증진, 조해, 종독, 종창, 중풍, 진통, 청명, 토혈, 폐결핵, 폐기천식, 풍비, 해수, 허약체질, 화상 등",
  "구과를 가을에 채취하여 씨껍질을 벗긴 후 사용한다.",
  "(내복): 탕전(湯煎)하거나, 가루약 또는 환제로 복용한다. ☞ 대변이 묽을 때는 사용을 삼간다."
];

console.log("잣나무 효능 태그 8개:", parseBioactivityTags(pinusBioactivity, 8));
