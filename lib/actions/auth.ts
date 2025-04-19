"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";

import config from "../config";
import ratelimit from "../ratelimit";
import { workflowClient } from "../workflow";

export async function signUp(params: AuthCredentails) {
  const { fullname, email, universityId, password, universityCard } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) return redirect("/too-fast");

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      fullname,
      email,
      universityId,
      password: hashedPassword,
      universityCard,
    });

    // Skip workflow trigger in local development environments to avoid the localhost error
    // In production environments, this should work properly with a public URL
    try {
      const isLocalhost =
        config.env.prodApiEndpoint?.includes("localhost") ||
        config.env.prodApiEndpoint?.includes("127.0.0.1");

      if (!isLocalhost) {
        await workflowClient.trigger({
          url: `${config.env.prodApiEndpoint}/api/workflow/onboarding`,
          body: {
            email,
            fullname,
          },
        });
      } else {
        console.log(
          "Skipping workflow trigger in local development environment"
        );
      }
    } catch (workflowError) {
      console.error("Workflow trigger error:", workflowError);
      // Non-critical error, continue with the signup process
    }

    // sign in on behalf of the new user
    await signInWithCredentials({ email, password });

    return { success: true };
  } catch (error) {
    console.error("Error in signup:", error);
    return {
      success: false,
      error: `An error occurred during sign up. ${error}`,
    };
  }
}

export async function signInWithCredentials(
  params: Pick<AuthCredentails, "email" | "password">
) {
  const { email, password } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) return redirect("/too-fast");

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: "Invalid email or password" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in signin:", error);
    return {
      success: false,
      error: `An error occurred during sign in. ${error}`,
    };
  }
}
