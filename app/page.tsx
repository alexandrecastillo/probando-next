import dynamic from "next/dynamic";

const WeddingGiftFlow = dynamic(() => import("./components/WeddingGiftFlow"), { ssr: false });

export default function Home() {
  return <WeddingGiftFlow />;
}
