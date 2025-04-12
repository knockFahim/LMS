import { redirect } from "next/navigation";
import BookRequestForm from "@/components/BookRequestForm";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";

const Page = async () => {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/sign-in?callbackUrl=/book-request");
  }

  // Check if user is approved
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user.length || user[0].status !== "APPROVED") {
    redirect("/my-profile?message=account-pending");
  }

  return (
    <section className="mt-16 mb-16">
      <div className="library">
        <p className="library-subtitle">Can't find what you're looking for?</p>
        <h2 className="library-title">
          Request a <span className="font-semibold text-primary">Book</span> to be added to our Library
        </h2>
      </div>

      <div className="mt-16 max-w-2xl mx-auto">
        <BookRequestForm userId={session.user.id} />
      </div>
    </section>
  );
};

export default Page;