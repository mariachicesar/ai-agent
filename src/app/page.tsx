import ChatDemo from '@/components/ChatDemo';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ChatDemo />
      <Link href="/calendar-agent" className="text-blue-500 hover:underline">
        Go to Calendar Agent
      </Link>
    </div>
  );
}
