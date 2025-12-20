import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create a PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please create a .env file with your Supabase connection string."
  );
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

async function main() {
  console.log("Starting seed...");

  // Check if study already exists
  const existingStudy = await prisma.study.findFirst({
    where: {
      title: "1 Timothy: Faith & Leadership",
      author: "Sophron Studies",
    },
  });

  if (existingStudy) {
    console.log("Study already exists, skipping creation.");
    return;
  }

  // Create the study
  const study = await prisma.study.create({
    data: {
      title: "1 Timothy: Faith & Leadership",
      description:
        "A deep dive into Paul's letter to Timothy, exploring themes of faith, leadership, and sound doctrine.",
      author: "Sophron Studies",
      price: 19.99,
      isPublished: true,
      isPremium: true,
      weeks: {
        create: [
          // Week 1
          {
            weekNumber: 1,
            title: "Introduction to 1 Timothy",
            description:
              "Understanding the context and purpose of Paul's letter to Timothy.",
            days: {
              create: [
                {
                  dayNumber: 1,
                  title: "The Greeting and Purpose",
                  content:
                    "Paul begins his letter with a greeting and immediately establishes the purpose: to instruct Timothy on how to conduct himself in the church.",
                  scripture: "1 Timothy 1:1-2",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What is the main purpose Paul states for writing this letter?",
                        questionType: "reflection",
                        order: 1,
                      },
                      {
                        questionText:
                          "How does Paul describe his relationship with Timothy?",
                        questionType: "text",
                        order: 2,
                      },
                      {
                        questionText:
                          "What does this greeting teach us about Christian relationships?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 2,
                  title: "Warning Against False Teachers",
                  content:
                    "Paul warns Timothy about those who teach false doctrine and engage in meaningless discussions.",
                  scripture: "1 Timothy 1:3-7",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What characteristics does Paul identify in false teachers?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "Why is sound doctrine important for the church?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "How can we guard against false teaching today?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 3,
                  title: "The Law and the Gospel",
                  content:
                    "Paul explains the proper use of the law and how it points to the gospel.",
                  scripture: "1 Timothy 1:8-11",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What is the purpose of the law according to Paul?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "How does the law relate to the gospel?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "What does this teach us about legalism vs. grace?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 4,
                  title: "Paul's Testimony of Grace",
                  content:
                    "Paul shares his own story of transformation by God's grace.",
                  scripture: "1 Timothy 1:12-17",
                  questions: {
                    create: [
                      {
                        questionText:
                          "How does Paul describe his past before meeting Christ?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "What does Paul's testimony teach us about God's grace?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "How can we share our own testimonies of grace?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 5,
                  title: "Fighting the Good Fight",
                  content:
                    "Paul charges Timothy to hold onto faith and a good conscience.",
                  scripture: "1 Timothy 1:18-20",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What does it mean to 'fight the good fight'?",
                        questionType: "reflection",
                        order: 1,
                      },
                      {
                        questionText:
                          "Why is maintaining a good conscience important?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "What warnings does Paul give about rejecting faith?",
                        questionType: "text",
                        order: 3,
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Week 2
          {
            weekNumber: 2,
            title: "Instructions for the Church",
            description:
              "Paul provides specific instructions for prayer, worship, and church leadership.",
            days: {
              create: [
                {
                  dayNumber: 1,
                  title: "Prayer for All People",
                  content:
                    "Paul instructs Timothy on the importance of praying for everyone, including those in authority.",
                  scripture: "1 Timothy 2:1-4",
                  questions: {
                    create: [
                      {
                        questionText:
                          "Why does Paul emphasize praying for all people?",
                        questionType: "reflection",
                        order: 1,
                      },
                      {
                        questionText:
                          "What is the relationship between prayer and peaceful living?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "How can we apply this instruction to our prayer life?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 2,
                  title: "One Mediator Between God and Man",
                  content:
                    "Paul explains that there is one God and one mediator - Jesus Christ.",
                  scripture: "1 Timothy 2:5-7",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What does it mean that Jesus is the 'one mediator'?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "Why is this truth important for our faith?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "How does this affect how we approach God?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 3,
                  title: "Instructions for Men and Women",
                  content:
                    "Paul provides guidance on how men and women should conduct themselves in worship.",
                  scripture: "1 Timothy 2:8-15",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What does Paul say about how men should pray?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "How should we interpret these instructions in our context?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "What principles can we apply today?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 4,
                  title: "Qualifications for Overseers",
                  content:
                    "Paul lists the qualifications required for church leaders.",
                  scripture: "1 Timothy 3:1-7",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What character qualities does Paul require for overseers?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "Why are these qualifications important?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "How do these standards apply to all believers?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
                {
                  dayNumber: 5,
                  title: "Qualifications for Deacons",
                  content:
                    "Paul provides similar qualifications for deacons and their wives.",
                  scripture: "1 Timothy 3:8-13",
                  questions: {
                    create: [
                      {
                        questionText:
                          "What are the key qualifications for deacons?",
                        questionType: "text",
                        order: 1,
                      },
                      {
                        questionText:
                          "How do these differ from overseer qualifications?",
                        questionType: "reflection",
                        order: 2,
                      },
                      {
                        questionText:
                          "What does this teach us about serving in the church?",
                        questionType: "reflection",
                        order: 3,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Created study:", study.title);
  console.log("Study ID:", study.id);
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

