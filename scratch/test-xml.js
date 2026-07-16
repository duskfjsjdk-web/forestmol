const { XMLParser } = require('fast-xml-parser');
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
	<body>
		<items>
			<PatentUtilityInfo>
				<Applicant>홍길동</Applicant>
				<ApplicationDate>20241227</ApplicationDate>
				<InventionName>특허1</InventionName>
				<RegistrationStatus>등록</RegistrationStatus>
			</PatentUtilityInfo>
			<TotalSearchCount>15906</TotalSearchCount>
		</items>
	</body>
</response>`;
const parser = new XMLParser();
const result = parser.parse(xml);
console.log(JSON.stringify(result, null, 2));
