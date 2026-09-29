import { AuthForm } from "@/components/auth-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;

  return <AuthForm mode="signup" next={typeof next === "string" ? next : ""} />;
}
