import { eq } from "drizzle-orm";
import { serve } from "@upstash/workflow/nextjs";

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";

import { sendEmail } from "@/lib/workflow";

type UserState = "non-active" | "active";
type InitialData = {
  email: string;
  fullname: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds
const THREE_DAYS_MS = 3 * ONE_DAY_MS; // 3 days in milliseconds
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS; // 30 days in milliseconds;

const getUserState = async (email: string): Promise<UserState> => {
  const userState = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userState.length === 0) return "non-active";

  const lastActivityDate = new Date(userState[0].lastActivityDate!);
  const now = new Date();
  const timeDifference = now.getTime() - lastActivityDate.getTime();

  if (timeDifference > THREE_DAYS_MS && timeDifference <= THIRTY_DAYS_MS) {
    return "non-active";
  }

  return "active";
};

export const { POST } = serve<InitialData>(async (context) => {
  const { email, fullname } = context.requestPayload;

  console.log("WORKFLOW PAYLOAD", email, fullname);

  await context.run("new-signup", async () => {
    const welcomeMessage = `
      <div>
        <p>Hi ${fullname},</p>
        <p>Welcome to the Brac University Library platform! We're excited to have you join us.</p>
        
        <h3>Getting Started</h3>
        <p>Here are some things you can do right away:</p>
        <ul>
          <li>Browse our collection of books in the <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/library">Library</a></li>
          <li>Check out <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/">featured books</a> on our homepage</li>
          <li>Update your <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/my-profile">profile information</a></li>
        </ul>
        
        <p>If you have any questions, feel free to contact our librarian at <a href="mailto:library@bracu.ac.bd">library@bracu.ac.bd</a>.</p>
        
        <p>Happy reading!</p>
        <p>The Brac University Library Team</p>
      </div>
    `;

    await sendEmail({
      email,
      subject: "Welcome to Brac University Library",
      message: welcomeMessage,
      plainText: false,
    });
  });

  await context.sleep("wait-for-3-days", 60 * 60 * 24 * 3);

  while (true) {
    const state = await context.run(
      "check-user-state",
      async () => await getUserState(email)
    );

    if (state === "non-active") {
      await context.run("send-email-non-active", async () => {
        const inactiveMessage = `
          <div>
            <p>Hi ${fullname},</p>
            <p>We noticed it's been a while since you last visited the Brac University Library platform.</p>
            
            <p>Did you know we've added new books to our collection recently? You might find something interesting to read!</p>
            
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/library" class="button">Browse Library</a></p>
            
            <p>We hope to see you back soon.</p>
            <p>The Brac University Library Team</p>
          </div>
        `;

        await sendEmail({
          email,
          subject: "We miss you at the library!",
          message: inactiveMessage,
          plainText: false,
        });
      });
    } else if (state === "active") {
      await context.run("send-email-active", async () => {
        const activeMessage = `
          <div>
            <p>Hi ${fullname},</p>
            <p>Thanks for being an active user of our library platform!</p>
            
            <h3>Book Recommendations For You</h3>
            <p>Based on your reading history, you might enjoy these books:</p>
            <ul>
              <li>Recent additions in your favorite genres</li>
              <li>Popular books among other students</li>
              <li>Academic resources for the current semester</li>
            </ul>
            
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://library.bracu.ac.bd"}/library" class="button">Discover More Books</a></p>
            
            <p>Happy reading!</p>
            <p>The Brac University Library Team</p>
          </div>
        `;

        await sendEmail({
          email,
          subject: "Book Recommendations Just For You",
          message: activeMessage,
          plainText: false,
        });
      });
    }

    await context.sleep("wait-for-1-month", 60 * 60 * 24 * 30);
  }
});
