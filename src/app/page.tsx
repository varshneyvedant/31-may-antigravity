'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role?.toLowerCase();
      if (role === 'owner') {
        router.push('/owner/dashboard');
      } else {
        router.push('/manager/dashboard');
      }
    }
  }, [session, status, router]);

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="card text-center p-12">
        <h1 className="text-4xl font-bold mb-4">Loading Secure Environment...</h1>
        <p className="text-gray-500 mb-8">
          Redirecting to your authorized portal.
        </p>
      </div>
    </div>
  );
}
