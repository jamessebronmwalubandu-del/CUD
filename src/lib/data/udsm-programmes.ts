export interface UDSMProgramme {
  name: string;
  years: number;
}

export interface UDSMCollege {
  code: string;
  name: string;
  programmes: UDSMProgramme[];
}

export const UDSM_COLLEGES: UDSMCollege[] = [
  {
    code: "CoAF",
    name: "College of Agricultural Sciences and Food Technology (CoAF)",
    programmes: [
      { name: "BSc in Beekeeping Science and Technology", years: 3 },
      { name: "BSc in Agricultural Engineering and Mechanization", years: 4 },
      { name: "BSc in Food Science and Technology", years: 4 },
      { name: "BSc in Agricultural and Natural Resources Economics and Business", years: 3 },
      { name: "BSc in Crop Science and Technology", years: 3 },
    ],
  },
  {
    code: "CoHU",
    name: "College of Humanities (CoHU)",
    programmes: [
      { name: "BA in Archaeology", years: 3 },
      { name: "BA in Archaeology and History", years: 3 },
      { name: "BA in Archaeology and Geography", years: 3 },
      { name: "BA in Communication Studies", years: 3 },
      { name: "BA in Diplomatic and Military History", years: 3 },
      { name: "BA in Heritage Management", years: 3 },
      { name: "BA in Art and Design", years: 3 },
      { name: "BA in Theatre Arts", years: 3 },
      { name: "BA in Film and Television Studies", years: 3 },
      { name: "BA in Philosophy and Ethics", years: 3 },
      { name: "BA in Music", years: 3 },
      { name: "BA in Language Studies", years: 3 },
      { name: "BA in Literature", years: 3 },
      { name: "BA in History", years: 3 },
      { name: "BA in History and Political Science", years: 3 },
      { name: "BA in History, Cultural Heritage Management and Tourism", years: 3 },
      { name: "BA with Education (CoHU)", years: 3 },
      { name: "BA with Education (Chinese and English)", years: 3 },
    ],
  },
  {
    code: "CoSS",
    name: "College of Social Sciences (CoSS)",
    programmes: [
      { name: "BA in Anthropology", years: 3 },
      { name: "BA in Geography and Environmental Studies", years: 3 },
      { name: "BA in Political Science and Public Administration", years: 3 },
      { name: "BA in Sociology", years: 3 },
      { name: "BA in Statistics", years: 3 },
      { name: "Bachelor of Social Work", years: 3 },
      { name: "BA in Psychology", years: 3 },
      { name: "BA in Library and Information Studies", years: 3 },
      { name: "BA with Education (CoSS)", years: 3 },
    ],
  },
  {
    code: "CoET",
    name: "College of Engineering and Technology (CoET)",
    programmes: [
      { name: "BSc in Chemical and Process Engineering", years: 4 },
      { name: "BSc in Civil Engineering", years: 4 },
      { name: "BSc in Electrical Engineering", years: 4 },
      { name: "BSc in Mechanical Engineering", years: 4 },
      { name: "BSc in Industrial Engineering", years: 4 },
      { name: "BSc in Textile Design and Technology", years: 4 },
      { name: "BSc in Textile Engineering", years: 4 },
      { name: "Bachelor of Architecture", years: 5 },
      { name: "BSc in Quantity Surveying", years: 4 },
      { name: "BSc in Geomatics", years: 4 },
    ],
  },
  {
    code: "CoNAS",
    name: "College of Natural and Applied Sciences (CoNAS)",
    programmes: [
      { name: "BSc in Actuarial Sciences", years: 3 },
      { name: "BSc in Applied Zoology", years: 3 },
      { name: "BSc in Botanical Sciences", years: 3 },
      { name: "BSc in Chemistry", years: 3 },
      { name: "BSc in Microbiology", years: 3 },
      { name: "BSc in Molecular Biology and Biotechnology", years: 3 },
      { name: "BSc in Wildlife Science and Conservation", years: 3 },
      { name: "BSc with Education", years: 3 },
      { name: "BSc in Petroleum Chemistry", years: 3 },
      { name: "BSc in Meteorology", years: 3 },
      { name: "BSc in Applied Microbiology and Chemistry", years: 3 },
      { name: "BSc in Chemistry and Physics", years: 3 },
      { name: "BSc in Mathematics and Statistics", years: 3 },
    ],
  },
  {
    code: "CoICT",
    name: "College of Information and Communication Technologies (CoICT)",
    programmes: [
      { name: "BSc in Computer Science", years: 3 },
      { name: "BSc in Electronic Science and Communication", years: 3 },
      { name: "BSc in Computer Engineering and Information Technology", years: 4 },
      { name: "BSc in Telecommunications Engineering", years: 4 },
      { name: "BSc in Business Information Technology", years: 3 },
      { name: "BSc in Electronics Engineering", years: 4 },
    ],
  },
  {
    code: "SoMG",
    name: "School of Mines and Geosciences (SoMG)",
    programmes: [
      { name: "BSc in Geophysics", years: 4 },
      { name: "BSc in Geology and Geothermal Resources", years: 4 },
      { name: "BSc in Petroleum Geology", years: 4 },
      { name: "BSc in Geology", years: 4 },
      { name: "BSc with Geology", years: 4 },
      { name: "BSc in Engineering Geology", years: 4 },
      { name: "BSc in Metallurgy and Mineral Processing Engineering", years: 4 },
      { name: "BSc in Mining Engineering", years: 4 },
      { name: "BSc in Petroleum Engineering", years: 4 },
    ],
  },
  {
    code: "SoAF",
    name: "School of Aquatic Sciences and Fisheries Technology (SoAF)",
    programmes: [
      { name: "BSc in Aquatic Sciences and Fisheries", years: 3 },
    ],
  },
  {
    code: "SJMC",
    name: "School of Journalism and Mass Communication (SJMC)",
    programmes: [
      { name: "BA in Journalism", years: 3 },
      { name: "BA in Mass Communication", years: 3 },
      { name: "BA in Public Relations and Advertising", years: 3 },
    ],
  },
  {
    code: "UDBS",
    name: "University of Dar es Salaam Business School (UDBS)",
    programmes: [
      { name: "Bachelor of Commerce in Accounting", years: 3 },
      { name: "Bachelor of Commerce in Banking and Financial Services", years: 3 },
      { name: "Bachelor of Commerce in Finance", years: 3 },
      { name: "Bachelor of Commerce in Human Resources Management", years: 3 },
      { name: "Bachelor of Commerce in Marketing", years: 3 },
      { name: "Bachelor of Commerce in Tourism and Hospitality Management", years: 3 },
      { name: "Bachelor of Business Administration (Evening Programme)", years: 3 },
      { name: "Bachelor of Commerce in Procurement and Supply Chain Management", years: 3 },
    ],
  },
  {
    code: "UDSoEC",
    name: "University of Dar es Salaam School of Economics (UDSoEC)",
    programmes: [
      { name: "BA in Economics", years: 3 },
      { name: "BA in Economics and Statistics", years: 3 },
    ],
  },
  {
    code: "SoED",
    name: "School of Education (SoED)",
    programmes: [
      { name: "Bachelor of Education in Adult and Community Education", years: 3 },
      { name: "Bachelor of Education in Commerce", years: 3 },
      { name: "Bachelor of Education in Early Childhood Education", years: 3 },
      { name: "Bachelor of Education in Physical Education and Sport Sciences", years: 3 },
      { name: "Bachelor of Education in Psychology", years: 3 },
    ],
  },
  {
    code: "UDSoL",
    name: "University of Dar es Salaam School of Law (UDSoL)",
    programmes: [
      { name: "Bachelor of Laws (LL.B.)", years: 4 },
      { name: "Bachelor of Arts in Law Enforcement", years: 3 },
    ],
  },
  {
    code: "IKS",
    name: "Institute of Kiswahili Studies (IKS)",
    programmes: [
      { name: "BA in Kiswahili", years: 3 },
    ],
  },
  {
    code: "IDS",
    name: "Institute of Development Studies (IDS)",
    programmes: [
      { name: "BA in Development Studies", years: 3 },
    ],
  },
];

export const ALL_UDSM_PROGRAMMES = UDSM_COLLEGES.flatMap((c) =>
  c.programmes.map((p) => ({
    collegeCode: c.code,
    collegeName: c.name,
    programme: p.name,
    years: p.years,
  }))
);
