import type { Metadata } from "next";
import { Planner } from "@/components/planner";

export const metadata: Metadata = {
  title: "投递计划",
  description: "对照简历拟出一份职位申请的答案。不填写，不提交。",
};

export default function Home() {
  return <Planner />;
}
