import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
// import { ConvexHttpClient } from "convex/browser";
// import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the Convex user ID
    const convexUser = await convex.query(api.users.getByClerkId, {
      clerkId: userId,
    });

    return NextResponse.json({
      clerkId: userId,
      convexUserId: convexUser?._id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}