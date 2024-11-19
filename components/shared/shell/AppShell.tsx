import { useState } from 'react';
import { Loading } from '@/components/shared';
import { useSession } from 'next-auth/react';
import React from 'react';
import Header from './Header';
import Drawer from './Drawer';

import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AppShell({ children }) {
  const router = useRouter();
  const { status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === 'loading') {
    return <Loading />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return;
  }

  const isDashboard = router.pathname === '/dashboard';

  return (
    <div>
        {!isDashboard && <Drawer sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      <div className={`${isDashboard ? '' : 'lg:pl-64'}`}>
      {isDashboard ? (
          <nav className="bg-white p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-x-24">
                <div className="text-cus_dark_pink font-cus_monserrat font-bold text-lg">
                  <Link href="/">{'Editur'}</Link>
                </div>
                <div className="hidden md:flex space-x-4 font-cus_monserrat font-semibold">
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
                    {'Home'}
                  </Link>
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
                    {'Video Editing Tools'}
                  </Link>
                </div>
              </div>
              <div>
                <Link href="/dashboard">
                  <button className="bg-cus_dark_pink text-white px-4 py-2 rounded-lg">
                    {'Dashboard'}
                  </button>
                </Link>
              </div>
            </div>
          </nav>
        ) : (
          <Header setSidebarOpen={setSidebarOpen} />
        )}
        <main className="py-5">
          <div className="mx-auto  max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}



// right now i am  replacing the logic of dasbaord  to replace with new design  and the rest code desing will be same and the below jsx if with out logic for dashbaord.

{/* <div>
<Drawer sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
<div className="lg:pl-64">
  <Header setSidebarOpen={setSidebarOpen} />
  <main className="py-5">
    <div className="mx-auto  max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </main>
</div>
</div> */}
