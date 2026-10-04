/**
 * CUD Management System — seed script.
 * Run with: bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CUD Management System...");

  // ----------------------------------------------------------------
  // 0. Clean slate (preserve nothing — this is a fresh install)
  // ----------------------------------------------------------------
  console.log("🧹 Cleaning existing data...");
  await Promise.all([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.eventRegistration.deleteMany(),
    prisma.event.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.attendanceSession.deleteMany(),
    prisma.document.deleteMany(),
    prisma.ministryMember.deleteMany(),
    prisma.ministry.deleteMany(),
    prisma.memberSkill.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.user.deleteMany(),
    prisma.member.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ]);

  // ----------------------------------------------------------------
  // 1. Skills catalogue
  // ----------------------------------------------------------------
  const skillCatalogue = [
    { name: "Worship Singing", category: "Music" },
    { name: "Keyboard / Piano", category: "Music" },
    { name: "Acoustic Guitar", category: "Music" },
    { name: "Bass Guitar", category: "Music" },
    { name: "Drums", category: "Music" },
    { name: "Sound Engineering", category: "Technical" },
    { name: "Video Editing", category: "Technical" },
    { name: "Photography", category: "Technical" },
    { name: "Graphic Design", category: "Technical" },
    { name: "Public Speaking", category: "Leadership" },
    { name: "Event Planning", category: "Leadership" },
    { name: "Prayer Intercession", category: "Spiritual" },
    { name: "Bible Teaching", category: "Spiritual" },
    { name: "Evangelism", category: "Spiritual" },
    { name: "Counselling", category: "Spiritual" },
    { name: "First Aid", category: "Service" },
    { name: "Cooking", category: "Service" },
    { name: "Ushering", category: "Service" },
    { name: "Drama / Acting", category: "Creative" },
    { name: "Spoken Word", category: "Creative" },
  ];

  const skills = await Promise.all(
    skillCatalogue.map((s) =>
      prisma.skill.create({ data: { name: s.name, category: s.category } })
    )
  );
  console.log(`✓ Created ${skills.length} skills`);

  // ----------------------------------------------------------------
  // 2. Ministries
  // ----------------------------------------------------------------
  const ministryData = [
    { name: "Praise & Worship", description: "Leads congregational worship during services.", color: "#0f766e" },
    { name: "Prayer Ministry", description: "Coordinates prayer meetings and intercession.", color: "#7c3aed" },
    { name: "Evangelism Ministry", description: "Outreach and soul-winning.", color: "#dc2626" },
    { name: "Media & Tech", description: "Sound, projection, livestream.", color: "#2563eb" },
    { name: "Drama Ministry", description: "Christian drama and skits.", color: "#ea580c" },
    { name: "Ushering & Protocol", description: "Welcoming and order during services.", color: "#16a34a" },
    { name: "Bible Study", description: "Facilitates weekly Bible study.", color: "#9333ea" },
  ];
  const ministries = await Promise.all(
    ministryData.map((m) => prisma.ministry.create({ data: m }))
  );
  console.log(`✓ Created ${ministries.length} ministries`);

  // ----------------------------------------------------------------
  // 3. Members (with linked User accounts)
  // ----------------------------------------------------------------
  const membersData = [
    {
      fullName: "Daniel Mwangi",
      regNumber: "CUD/001/2022",
      email: "chairman@cud.ac.ke",
      phoneNumber: "+254712000001",
      gender: "MALE",
      faculty: "School of Theology",
      department: "Pastoral Studies",
      course: "Bachelor of Theology",
      yearOfStudy: "YEAR_3",
      hostel: "Hallelujah Hostel",
      homeRegion: "Nairobi",
      emergencyContact: "+254722000001",
      biography: "Chairman of CASFETA CUD Chapter. Passionate about discipleship and worship.",
      role: "SUPER_ADMIN",
      username: "chairman",
      password: "CUD@2024",
      skills: ["Worship Singing", "Public Speaking", "Prayer Intercession", "Bible Teaching"],
      ministryLead: "Praise & Worship",
    },
    {
      fullName: "Grace Wanjiru",
      regNumber: "CUD/002/2022",
      email: "vicechair@cud.ac.ke",
      phoneNumber: "+254712000002",
      gender: "FEMALE",
      faculty: "School of Education",
      department: "Educational Studies",
      course: "Bachelor of Education",
      yearOfStudy: "YEAR_3",
      hostel: "Emmanuel Hostel",
      homeRegion: "Kiambu",
      emergencyContact: "+254722000002",
      biography: "Vice Chair. Committed to mentoring young women in faith.",
      role: "SUPER_ADMIN",
      username: "vicechair",
      password: "CUD@2024",
      skills: ["Prayer Intercession", "Counselling", "Event Planning"],
      ministryLead: "Prayer Ministry",
    },
    {
      fullName: "Samuel Kiptoo",
      regNumber: "CUD/003/2021",
      email: "secretary@cud.ac.ke",
      phoneNumber: "+254712000003",
      gender: "MALE",
      faculty: "School of Business",
      department: "Business Administration",
      course: "Bachelor of Commerce",
      yearOfStudy: "YEAR_4",
      hostel: "Zion Hostel",
      homeRegion: "Eldoret",
      emergencyContact: "+254722000003",
      biography: "Secretary. Detail-oriented record-keeper.",
      role: "SUPER_ADMIN",
      username: "secretary",
      password: "CUD@2024",
      skills: ["Public Speaking", "Event Planning"],
      ministryLead: null,
    },
    {
      fullName: "Mary Akinyi",
      regNumber: "CUD/004/2021",
      email: "treasurer@cud.ac.ke",
      phoneNumber: "+254712000004",
      gender: "FEMALE",
      faculty: "School of Business",
      department: "Finance",
      course: "Bachelor of Finance",
      yearOfStudy: "YEAR_4",
      hostel: "Bethany Hostel",
      homeRegion: "Kisumu",
      emergencyContact: "+254722000004",
      biography: "Treasurer. Steward of fellowship finances.",
      role: "SUPER_ADMIN",
      username: "treasurer",
      password: "CUD@2024",
      skills: ["Event Planning", "Public Speaking"],
      ministryLead: null,
    },
    {
      fullName: "Pastor John Kamau",
      regNumber: "CUD/005/2020",
      email: "pastor@cud.ac.ke",
      phoneNumber: "+254712000005",
      gender: "MALE",
      faculty: "School of Theology",
      department: "Pastoral Studies",
      course: "Master of Divinity",
      yearOfStudy: "YEAR_2",
      hostel: null,
      homeRegion: "Nakuru",
      emergencyContact: "+254722000005",
      biography: "Fellowship Pastor. Provides spiritual oversight.",
      role: "SUPER_ADMIN",
      username: "pastor",
      password: "CUD@2024",
      skills: ["Bible Teaching", "Counselling", "Prayer Intercession", "Public Speaking"],
      ministryLead: "Bible Study",
    },
    {
      fullName: "Esther Njeri",
      regNumber: "CUD/006/2022",
      email: "ict@cud.ac.ke",
      phoneNumber: "+254712000006",
      gender: "FEMALE",
      faculty: "School of Computing",
      department: "Computer Science",
      course: "Bachelor of Science in Computer Science",
      yearOfStudy: "YEAR_3",
      hostel: "Maranatha Hostel",
      homeRegion: "Nyeri",
      emergencyContact: "+254722000006",
      biography: "ICT Administrator. Maintains the digital systems.",
      role: "SUPER_ADMIN",
      username: "ictadmin",
      password: "CUD@2024",
      skills: ["Sound Engineering", "Video Editing", "Graphic Design", "Photography"],
      ministryLead: "Media & Tech",
    },
    {
      fullName: "Peter Otieno",
      regNumber: "CUD/007/2022",
      email: "worship.lead@cud.ac.ke",
      phoneNumber: "+254712000007",
      gender: "MALE",
      faculty: "School of Music",
      department: "Music Performance",
      course: "Bachelor of Music",
      yearOfStudy: "YEAR_3",
      hostel: "Hallelujah Hostel",
      homeRegion: "Homabay",
      emergencyContact: "+254722000007",
      biography: "Worship leader with a heart for revival.",
      role: "ADMIN",
      username: "worshiplead",
      password: "CUD@2024",
      skills: ["Worship Singing", "Acoustic Guitar", "Keyboard / Piano"],
      ministryLead: "Praise & Worship",
    },
    {
      fullName: "Ruth Chebet",
      regNumber: "CUD/008/2022",
      email: "prayer.lead@cud.ac.ke",
      phoneNumber: "+254712000008",
      gender: "FEMALE",
      faculty: "School of Education",
      department: "Religious Studies",
      course: "Bachelor of Education (Religion)",
      yearOfStudy: "YEAR_3",
      hostel: "Emmanuel Hostel",
      homeRegion: "Kericho",
      emergencyContact: "+254722000008",
      biography: "Prayer coordinator.",
      role: "ADMIN",
      username: "prayerlead",
      password: "CUD@2024",
      skills: ["Prayer Intercession", "Counselling"],
      ministryLead: "Prayer Ministry",
    },
    {
      fullName: "Joseph Mutua",
      regNumber: "CUD/009/2021",
      email: "evangelism.lead@cud.ac.ke",
      phoneNumber: "+254712000009",
      gender: "MALE",
      faculty: "School of Theology",
      department: "Missions",
      course: "Bachelor of Theology (Missions)",
      yearOfStudy: "YEAR_4",
      hostel: "Zion Hostel",
      homeRegion: "Machakos",
      emergencyContact: "+254722000009",
      biography: "Passionate about reaching the lost.",
      role: "ADMIN",
      username: "evanglead",
      password: "CUD@2024",
      skills: ["Evangelism", "Public Speaking", "Drama / Acting"],
      ministryLead: "Evangelism Ministry",
    },
    {
      fullName: "Faith Wambui",
      regNumber: "CUD/010/2022",
      email: "media.lead@cud.ac.ke",
      phoneNumber: "+254712000010",
      gender: "FEMALE",
      faculty: "School of Computing",
      department: "Information Technology",
      course: "Bachelor of Science in IT",
      yearOfStudy: "YEAR_3",
      hostel: "Maranatha Hostel",
      homeRegion: "Murang'a",
      emergencyContact: "+254722000010",
      biography: "Leads the media team.",
      role: "ADMIN",
      username: "medialead",
      password: "CUD@2024",
      skills: ["Video Editing", "Graphic Design", "Sound Engineering"],
      ministryLead: "Media & Tech",
    },
    {
      fullName: "Benjamin Kariuki",
      regNumber: "CUD/011/2023",
      email: "benjamin.kariuki@stud.cud.ac.ke",
      phoneNumber: "+254712000011",
      gender: "MALE",
      faculty: "School of Engineering",
      department: "Electrical Engineering",
      course: "Bachelor of Science in Electrical Engineering",
      yearOfStudy: "YEAR_2",
      hostel: "Bethany Hostel",
      homeRegion: "Meru",
      emergencyContact: "+254722000011",
      biography: "Member of the worship team (drummer).",
      role: "MEMBER",
      username: "benjamin",
      password: "CUD@2024",
      skills: ["Drums", "Sound Engineering"],
      ministryLead: null,
    },
    {
      fullName: "Joy Auma",
      regNumber: "CUD/012/2023",
      email: "joy.auma@stud.cud.ac.ke",
      phoneNumber: "+254712000012",
      gender: "FEMALE",
      faculty: "School of Nursing",
      department: "Nursing",
      course: "Bachelor of Science in Nursing",
      yearOfStudy: "YEAR_2",
      hostel: "Emmanuel Hostel",
      homeRegion: "Kakamega",
      emergencyContact: "+254722000012",
      biography: "Active in drama and spoken word.",
      role: "MEMBER",
      username: "joy",
      password: "CUD@2024",
      skills: ["Drama / Acting", "Spoken Word"],
      ministryLead: null,
    },
    {
      fullName: "Aaron Maina",
      regNumber: "CUD/013/2023",
      email: "aaron.maina@stud.cud.ac.ke",
      phoneNumber: "+254712000013",
      gender: "MALE",
      faculty: "School of Agriculture",
      department: "Agricultural Economics",
      course: "Bachelor of Science in Agricultural Economics",
      yearOfStudy: "YEAR_2",
      hostel: "Hallelujah Hostel",
      homeRegion: "Nyahururu",
      emergencyContact: "+254722000013",
      biography: "Usher and first-aid responder.",
      role: "MEMBER",
      username: "aaron",
      password: "CUD@2024",
      skills: ["Ushering", "First Aid"],
      ministryLead: null,
    },
    {
      fullName: "Sarah Nyambura",
      regNumber: "CUD/014/2022",
      email: "sarah.nyambura@stud.cud.ac.ke",
      phoneNumber: "+254712000014",
      gender: "FEMALE",
      faculty: "School of Education",
      department: "Early Childhood",
      course: "Bachelor of Education (ECE)",
      yearOfStudy: "YEAR_3",
      hostel: "Bethany Hostel",
      homeRegion: "Nakuru",
      emergencyContact: "+254722000014",
      biography: "Worship singer and songwriter.",
      role: "MEMBER",
      username: "sarah",
      password: "CUD@2024",
      skills: ["Worship Singing", "Keyboard / Piano"],
      ministryLead: null,
    },
    {
      fullName: "Michael Otieno",
      regNumber: "CUD/015/2021",
      email: "michael.otieno@stud.cud.ac.ke",
      phoneNumber: "+254712000015",
      gender: "MALE",
      faculty: "School of Law",
      department: "Law",
      course: "Bachelor of Laws (LLB)",
      yearOfStudy: "YEAR_4",
      hostel: "Zion Hostel",
      homeRegion: "Siaya",
      emergencyContact: "+254722000015",
      biography: "Bible study facilitator.",
      role: "MEMBER",
      username: "michael",
      password: "CUD@2024",
      skills: ["Bible Teaching", "Public Speaking"],
      ministryLead: null,
    },
    {
      fullName: "Rebecca Wanjiku",
      regNumber: "CUD/016/2023",
      email: "rebecca.wanjiku@stud.cud.ac.ke",
      phoneNumber: "+254712000016",
      gender: "FEMALE",
      faculty: "School of Medicine",
      department: "Medicine",
      course: "Bachelor of Medicine, Bachelor of Surgery (MBChB)",
      yearOfStudy: "YEAR_3",
      hostel: "Maranatha Hostel",
      homeRegion: "Kirinyaga",
      emergencyContact: "+254722000016",
      biography: "Intercessor and counsellor.",
      role: "MEMBER",
      username: "rebecca",
      password: "CUD@2024",
      skills: ["Prayer Intercession", "Counselling", "First Aid"],
      ministryLead: null,
    },
    {
      fullName: "David Kimani",
      regNumber: "CUD/017/2022",
      email: "david.kimani@stud.cud.ac.ke",
      phoneNumber: "+254712000017",
      gender: "MALE",
      faculty: "School of Engineering",
      department: "Mechanical Engineering",
      course: "Bachelor of Science in Mechanical Engineering",
      yearOfStudy: "YEAR_3",
      hostel: "Hallelujah Hostel",
      homeRegion: "Thika",
      emergencyContact: "+254722000017",
      biography: "Bass guitarist in worship team.",
      role: "MEMBER",
      username: "david",
      password: "CUD@2024",
      skills: ["Bass Guitar", "Sound Engineering"],
      ministryLead: null,
    },
    {
      fullName: "Hannah Atieno",
      regNumber: "CUD/018/2023",
      email: "hannah.atieno@stud.cud.ac.ke",
      phoneNumber: "+254712000018",
      gender: "FEMALE",
      faculty: "School of Social Sciences",
      department: "Sociology",
      course: "Bachelor of Arts in Sociology",
      yearOfStudy: "YEAR_2",
      hostel: "Emmanuel Hostel",
      homeRegion: "Bondo",
      emergencyContact: "+254722000018",
      biography: "Evangelism team member.",
      role: "MEMBER",
      username: "hannah",
      password: "CUD@2024",
      skills: ["Evangelism", "Cooking", "Ushering"],
      ministryLead: null,
    },
    {
      fullName: "Stephen Mwangi",
      regNumber: "CUD/019/2022",
      email: "stephen.mwangi@stud.cud.ac.ke",
      phoneNumber: "+254712000019",
      gender: "MALE",
      faculty: "School of Computing",
      department: "Software Engineering",
      course: "Bachelor of Science in Software Engineering",
      yearOfStudy: "YEAR_3",
      hostel: "Maranatha Hostel",
      homeRegion: "Limuru",
      emergencyContact: "+254722000019",
      biography: "Media team — video and livestream.",
      role: "MEMBER",
      username: "stephen",
      password: "CUD@2024",
      skills: ["Video Editing", "Photography"],
      ministryLead: null,
    },
    {
      fullName: "Naomi Cherono",
      regNumber: "CUD/020/2023",
      email: "naomi.cherono@stud.cud.ac.ke",
      phoneNumber: "+254712000020",
      gender: "FEMALE",
      faculty: "School of Education",
      department: "Mathematics",
      course: "Bachelor of Education (Maths)",
      yearOfStudy: "YEAR_2",
      hostel: "Bethany Hostel",
      homeRegion: "Bomet",
      emergencyContact: "+254722000020",
      biography: "Usher and protocol team.",
      role: "MEMBER",
      username: "naomi",
      password: "CUD@2024",
      skills: ["Ushering", "Cooking"],
      ministryLead: null,
    },
  ];

  // Hash the shared password once
  const passwordHash = await bcrypt.hash("CUD@2024", 10);

  type CreatedMember = {
    id: string;
    fullName: string;
    role: string;
    skillNames: string[];
    ministryLead: string | null;
  };
  const createdMembers: CreatedMember[] = [];

  for (const m of membersData) {
    const member = await prisma.member.create({
      data: {
        fullName: m.fullName,
        regNumber: m.regNumber,
        phoneNumber: m.phoneNumber,
        email: m.email,
        gender: m.gender,
        faculty: m.faculty,
        department: m.department,
        course: m.course,
        yearOfStudy: m.yearOfStudy,
        hostel: m.hostel,
        homeRegion: m.homeRegion,
        emergencyContact: m.emergencyContact,
        biography: m.biography,
        status: "ACTIVE",
      },
    });

    await prisma.user.create({
      data: {
        email: m.email!,
        username: m.username,
        passwordHash,
        role: m.role,
        memberId: member.id,
        isActive: true,
      },
    });

    createdMembers.push({
      id: member.id,
      fullName: member.fullName,
      role: m.role,
      skillNames: m.skills,
      ministryLead: m.ministryLead,
    });
  }
  console.log(`✓ Created ${createdMembers.length} members with user accounts`);

  // ----------------------------------------------------------------
  // 4. Assign members to ministries & set leaders
  // ----------------------------------------------------------------
  for (const cm of createdMembers) {
    // Assign leader role
    if (cm.ministryLead) {
      const ministry = ministries.find((mi) => mi.name === cm.ministryLead);
      if (ministry) {
        await prisma.ministry.update({
          where: { id: ministry.id },
          data: { leaderId: cm.id },
        });
        await prisma.ministryMember.create({
          data: { ministryId: ministry.id, memberId: cm.id, role: "LEADER" },
        });
      }
    }
  }

  // Distribute members across ministries
  const ministryBuckets: Record<string, string[]> = {
    "Praise & Worship": ["Sarah Nyambura", "David Kimani", "Benjamin Kariuki"],
    "Prayer Ministry": ["Rebecca Wanjiku"],
    "Evangelism Ministry": ["Hannah Atieno"],
    "Media & Tech": ["Stephen Mwangi"],
    "Drama Ministry": ["Joy Auma"],
    "Ushering & Protocol": ["Aaron Maina", "Naomi Cherono"],
    "Bible Study": ["Michael Otieno"],
  };

  for (const [ministryName, memberNames] of Object.entries(ministryBuckets)) {
    const ministry = ministries.find((m) => m.name === ministryName);
    if (!ministry) continue;
    for (const name of memberNames) {
      const cm = createdMembers.find((m) => m.fullName === name);
      if (!cm) continue;
      const exists = await prisma.ministryMember.findUnique({
        where: { ministryId_memberId: { ministryId: ministry.id, memberId: cm.id } },
      });
      if (!exists) {
        await prisma.ministryMember.create({
          data: { ministryId: ministry.id, memberId: cm.id, role: "MEMBER" },
        });
      }
    }
  }
  console.log("✓ Assigned members to ministries");

  // ----------------------------------------------------------------
  // 5. Member skills (mostly approved; a few pending for demo)
  // ----------------------------------------------------------------
  const skillByName = new Map(skills.map((s) => [s.name, s]));
  for (const cm of createdMembers) {
    for (const skillName of cm.skillNames) {
      const skill = skillByName.get(skillName);
      if (!skill) continue;
      const status = Math.random() < 0.85 ? "APPROVED" : "PENDING";
      await prisma.memberSkill.create({
        data: {
          memberId: cm.id,
          skillId: skill.id,
          status,
          proficiency: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"][Math.floor(Math.random() * 4)],
          reviewedAt: status === "APPROVED" ? new Date() : null,
          reviewedBy: status === "APPROVED" ? createdMembers[0].id : null,
        },
      });
    }
  }
  console.log("✓ Assigned skills to members");

  // ----------------------------------------------------------------
  // 6. Attendance sessions & records (last 8 Sundays + midweeks)
  // ----------------------------------------------------------------
  const attendanceTypes = ["SUNDAY_FELLOWSHIP", "BIBLE_STUDY", "PRAYER_MEETING"];
  const sessions: { id: string; date: Date; type: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    date.setHours(10, 0, 0, 0);
    for (const type of attendanceTypes) {
      const sessionDate = new Date(date);
      if (type === "BIBLE_STUDY") sessionDate.setDate(date.getDate() + 3);
      if (type === "PRAYER_MEETING") sessionDate.setDate(date.getDate() + 5);
      const session = await prisma.attendanceSession.create({
        data: {
          title: `${type.replace(/_/g, " ")} — ${sessionDate.toISOString().slice(0, 10)}`,
          type,
          date: sessionDate,
        },
      });
      sessions.push({ id: session.id, date: sessionDate, type });
    }
  }

  // For each session, mark ~80% of members present
  for (const session of sessions) {
    for (const cm of createdMembers) {
      const present = Math.random() < 0.8;
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          memberId: cm.id,
          present,
          reason: present ? null : "Travel / Commitment",
        },
      });
    }
  }
  console.log(`✓ Created ${sessions.length} attendance sessions with records`);

  // ----------------------------------------------------------------
  // 7. Announcements
  // ----------------------------------------------------------------
  const announcementSamples = [
    {
      title: "Welcome to CASFETA CUD Chapter",
      content: "Karibu! We are glad to have you in our fellowship. May God bless your stay.",
      audience: "ALL",
      priority: "HIGH",
      authorName: "Daniel Mwangi",
    },
    {
      title: "Sunday Service — 10:00 AM",
      content: "Join us this Sunday at 10:00 AM in the main chapel. Praise & Worship team is leading.",
      audience: "ALL",
      priority: "NORMAL",
      authorName: "Peter Otieno",
    },
    {
      title: "Prayer Meeting — Every Wednesday",
      content: "Midweek prayer meetings resume this Wednesday at 6:00 PM in Room 12. All are welcome.",
      audience: "ALL",
      priority: "NORMAL",
      authorName: "Ruth Chebet",
    },
    {
      title: "Evangelism Outreach — Saturday",
      content: "This Saturday we are heading to the nearby community for evangelism. Meet at the chapel at 9 AM.",
      audience: "ALL",
      priority: "HIGH",
      authorName: "Joseph Mutua",
    },
    {
      title: "Media Team Recruitment",
      content: "The Media & Tech ministry is recruiting new members. If you have skills in sound, video, or photography, please apply.",
      audience: "ALL",
      priority: "NORMAL",
      authorName: "Faith Wambui",
    },
  ];
  for (const a of announcementSamples) {
    const author = createdMembers.find((m) => m.fullName === a.authorName);
    await prisma.announcement.create({
      data: {
        title: a.title,
        content: a.content,
        audience: a.audience,
        priority: a.priority,
        authorId: author?.id ?? null,
        pinned: a.title.includes("Welcome"),
      },
    });
  }
  console.log(`✓ Created ${announcementSamples.length} announcements`);

  // ----------------------------------------------------------------
  // 8. Events
  // ----------------------------------------------------------------
  const eventsData = [
    {
      title: "Annual Conference 2024 — Flames of Revival",
      description: "Three-day conference with guest speakers, worship, and fellowship.",
      location: "Main Auditorium",
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 17),
      capacity: 500,
      organizerName: "Daniel Mwangi",
    },
    {
      title: "Worship Night",
      description: "An evening of uninterrupted worship led by the Praise & Worship team.",
      location: "Chapel",
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 3),
      capacity: 200,
      organizerName: "Peter Otieno",
    },
    {
      title: "Bible Study Kickoff",
      description: "Launch of this semester's Bible study series — 'Foundations of Faith'.",
      location: "Room 12",
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 90),
      capacity: 80,
      organizerName: "Pastor John Kamau",
    },
    {
      title: "Community Evangelism",
      description: "Door-to-door evangelism in the surrounding community.",
      location: "Meet at Chapel",
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 4),
      capacity: 50,
      organizerName: "Joseph Mutua",
    },
  ];
  for (const e of eventsData) {
    const organizer = createdMembers.find((m) => m.fullName === e.organizerName);
    const event = await prisma.event.create({
      data: {
        title: e.title,
        description: e.description,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        capacity: e.capacity,
        status: "UPCOMING",
        organizerId: organizer?.id ?? null,
      },
    });
    // Register a few members
    const sampleRegistrants = createdMembers.slice(0, 8);
    for (const m of sampleRegistrants) {
      await prisma.eventRegistration.create({
        data: { eventId: event.id, memberId: m.id },
      });
    }
  }
  console.log(`✓ Created ${eventsData.length} events with registrations`);

  // ----------------------------------------------------------------
  // 9. Sample documents
  // ----------------------------------------------------------------
  const documentsData = [
    { title: "CASFETA CUD Constitution (2024)", category: "CONSTITUTION", fileName: "constitution-2024.pdf", fileType: "pdf", fileSize: 248_000, accessLevel: "ALL" },
    { title: "Minutes — Leaders Meeting Aug 2024", category: "MEETING_MINUTES", fileName: "minutes-aug-2024.pdf", fileType: "pdf", fileSize: 86_000, accessLevel: "ADMIN" },
    { title: "Semester Timetable", category: "TIMETABLES", fileName: "semester-timetable.xlsx", fileType: "xlsx", fileSize: 42_000, accessLevel: "ALL" },
    { title: "Official Letter — Conference Invite", category: "LETTERS", fileName: "conference-invite.docx", fileType: "docx", fileSize: 32_000, accessLevel: "ALL" },
    { title: "Q3 Financial Report", category: "FINANCIAL", fileName: "q3-financial-report.xlsx", fileType: "xlsx", fileSize: 56_000, accessLevel: "ADMIN" },
    { title: "Worship Team Roster", category: "SCHEDULES", fileName: "worship-roster.pdf", fileType: "pdf", fileSize: 28_000, accessLevel: "ALL" },
  ];
  const ictAdmin = createdMembers.find((m) => m.fullName === "Esther Njeri");
  for (const d of documentsData) {
    await prisma.document.create({
      data: {
        title: d.title,
        category: d.category,
        fileName: d.fileName,
        filePath: `/uploads/${d.fileName}`,
        fileType: d.fileType,
        fileSize: d.fileSize,
        accessLevel: d.accessLevel,
        uploadedById: ictAdmin?.id ?? null,
      },
    });
  }
  console.log(`✓ Created ${documentsData.length} documents`);

  // ----------------------------------------------------------------
  // 10. System settings
  // ----------------------------------------------------------------
  const settings = [
    { key: "ORG_NAME", value: "CASFETA — CUD Chapter", description: "Organisation display name" },
    { key: "SMS_PROVIDER", value: "africas_talking", description: "SMS gateway provider" },
    { key: "SMS_SENDER_ID", value: "CASFETA", description: "Africa's Talking sender ID" },
    { key: "DEFAULT_AUDIENCE", value: "ALL", description: "Default announcement audience" },
    { key: "ATTENDANCE_THRESHOLD", value: "0.6", description: "Minimum attendance ratio to remain 'Active'" },
    { key: "CURRENCY", value: "KES", description: "Default currency for financial reports" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log("✓ Created system settings");

  // ----------------------------------------------------------------
  // 11. Audit log entry
  // ----------------------------------------------------------------
  await prisma.auditLog.create({
    data: {
      action: "CREATE",
      module: "AUTH",
      description: "System seeded with initial data.",
      metadata: JSON.stringify({ members: createdMembers.length, ministries: ministries.length }),
    },
  });

  console.log("\n🎉 Seeding complete!");
  console.log("─────────────────────────────────────────────");
  console.log("Login credentials (all accounts share the same password):");
  console.log("  Password: CUD@2024");
  console.log("");
  console.log("Super Admin accounts:");
  console.log("  chairman@cud.ac.ke    (Daniel Mwangi — Chairman)");
  console.log("  vicechair@cud.ac.ke   (Grace Wanjiru — Vice Chair)");
  console.log("  secretary@cud.ac.ke   (Samuel Kiptoo — Secretary)");
  console.log("  treasurer@cud.ac.ke   (Mary Akinyi — Treasurer)");
  console.log("  pastor@cud.ac.ke      (Pastor John Kamau)");
  console.log("  ict@cud.ac.ke         (Esther Njeri — ICT Admin)");
  console.log("");
  console.log("Admin (Ministry Leader) accounts:");
  console.log("  worship.lead@cud.ac.ke    (Peter Otieno)");
  console.log("  prayer.lead@cud.ac.ke     (Ruth Chebet)");
  console.log("  evangelism.lead@cud.ac.ke (Joseph Mutua)");
  console.log("  media.lead@cud.ac.ke      (Faith Wambui)");
  console.log("");
  console.log("Member account:");
  console.log("  benjamin.kariuki@stud.cud.ac.ke (Benjamin Kariuki)");
  console.log("─────────────────────────────────────────────");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
