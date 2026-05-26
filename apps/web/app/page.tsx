import { DemoFlow } from "./demo-flow";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export default function HomePage() {
  return <DemoFlow apiBaseUrl={apiBaseUrl} />;
}
