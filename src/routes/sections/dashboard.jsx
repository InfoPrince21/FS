// src/routes/dashboard.jsx

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AccountLayout } from 'src/sections/account/account-layout';

import { AuthGuard } from 'src/auth/guard';

import { usePathname } from '../hooks';

// ----------------------------------------------------------------------

// Overview
const IndexPage = lazy(() => import('src/pages/dashboard'));
const OverviewAnalyticsPage = lazy(() => import('src/pages/dashboard/analytics'));
const OverviewBankingPage = lazy(() => import('src/pages/dashboard/banking'));
const OverviewBookingPage = lazy(() => import('src/pages/dashboard/booking'));
const OverviewCoursePage = lazy(() => import('src/pages/dashboard/course'));
const OverviewEcommercePage = lazy(() => import('src/pages/dashboard/ecommerce'));
const OverviewFilePage = lazy(() => import('src/pages/dashboard/file'));
// Product
const ProductCreatePage = lazy(() => import('src/pages/dashboard/product/new'));
const ProductDetailsPage = lazy(() => import('src/pages/dashboard/product/details'));
const ProductEditPage = lazy(() => import('src/pages/dashboard/product/edit'));
const ProductListPage = lazy(() => import('src/pages/dashboard/product/list'));
// Order
const OrderDetailsPage = lazy(() => import('src/pages/dashboard/order/details'));
const OrderListPage = lazy(() => import('src/pages/dashboard/order/list'));
// Invoice
const InvoiceCreatePage = lazy(() => import('src/pages/dashboard/invoice/new'));
const InvoiceDetailsPage = lazy(() => import('src/pages/dashboard/invoice/details'));
const InvoiceEditPage = lazy(() => import('src/pages/dashboard/invoice/edit'));
const InvoiceListPage = lazy(() => import('src/pages/dashboard/invoice/list'));
// User
const AccountBillingPage = lazy(() => import('src/pages/dashboard/user/account/billing'));
const AccountChangePasswordPage = lazy(
  () => import('src/pages/dashboard/user/account/change-password')
);
const AccountGeneralPage = lazy(() => import('src/pages/dashboard/user/account/general'));
const AccountNotificationsPage = lazy(
  () => import('src/pages/dashboard/user/account/notifications')
);
// --- ADD THESE NEW IMPORTS ---
const AccountAchievementsPage = lazy(() => import('src/pages/dashboard/user/account/achievements'));
const AccountMeritsPage = lazy(() => import('src/pages/dashboard/user/account/merits'));
const Account3DAvatarPage = lazy(() => import('src/pages/dashboard/user/account/3d-avatar-page'));

const AccountSocialsPage = lazy(() => import('src/pages/dashboard/user/account/socials'));
const UserCardsPage = lazy(() => import('src/pages/dashboard/user/cards'));
const UserCreatePage = lazy(() => import('src/pages/dashboard/user/new'));
const UserEditPage = lazy(() => import('src/pages/dashboard/user/edit'));
const UserListPage = lazy(() => import('src/pages/dashboard/user/list'));
const UserProfilePage = lazy(() => import('src/pages/dashboard/user/profile'));
const UserProfileViewPage = lazy(() => import('src/pages/dashboard/user/profile-view')); // <--- NEW IMPORT for dynamic profile view

// Blog
const BlogEditPostPage = lazy(() => import('src/pages/dashboard/post/edit'));
const BlogNewPostPage = lazy(() => import('src/pages/dashboard/post/new'));
const BlogPostPage = lazy(() => import('src/pages/dashboard/post/details'));
const BlogPostsPage = lazy(() => import('src/pages/dashboard/post/list'));
// Job
const JobCreatePage = lazy(() => import('src/pages/dashboard/job/new'));
const JobDetailsPage = lazy(() => import('src/pages/dashboard/job/details'));
const JobEditPage = lazy(() => import('src/pages/dashboard/job/edit'));
const JobListPage = lazy(() => import('src/pages/dashboard/job/list'));
// Tour
const TourCreatePage = lazy(() => import('src/pages/dashboard/tour/new'));
const TourDetailsPage = lazy(() => import('src/pages/dashboard/tour/details'));
const TourEditPage = lazy(() => import('src/pages/dashboard/tour/edit'));
const TourListPage = lazy(() => import('src/pages/dashboard/tour/list'));
// File manager
const FileManagerPage = lazy(() => import('src/pages/dashboard/file-manager'));
// App
const CalendarPage = lazy(() => import('src/pages/dashboard/calendar'));
const ChatPage = lazy(() => import('src/pages/dashboard/chat'));
const KanbanPage = lazy(() => import('src/pages/dashboard/kanban'));
const MailPage = lazy(() => import('src/pages/dashboard/mail'));
// Test render page by role
const PermissionDeniedPage = lazy(() => import('src/pages/dashboard/permission'));
// Blank page
const BlankPage = lazy(() => import('src/pages/dashboard/blank'));
const ParamsPage = lazy(() => import('src/pages/dashboard/params'));
// Organization
const CreateOrganizationPage = lazy(() => import('src/pages/dashboard/organizations/create'));
const OrganizationsListPage = lazy(() => import('src/pages/dashboard/organizations/list'));
// Games
const GameListPage = lazy(() => import('src/pages/dashboard/games/list'));
const GameCreatePage = lazy(() => import('src/pages/dashboard/games/new'));
const GameDetailsPage = lazy(() => import('src/pages/dashboard/games/details'));
const GameEditPage = lazy(() => import('src/pages/dashboard/games/edit'));
const GameAchievementsPage = lazy(() => import('src/pages/dashboard/games/achievements')); // <--- ADDED IMPORT

// Teams
const TeamListPage = lazy(() => import('src/pages/dashboard/teams/list'));
const TeamCreatePage = lazy(() => import('src/pages/dashboard/teams/new'));
const TeamDetailsPage = lazy(() => import('src/pages/dashboard/teams/details'));
const TeamEditPage = lazy(() => import('src/pages/dashboard/teams/edit'));

// --- DRAFTS - NEW! ---
const DraftListPage = lazy(() => import('src/pages/dashboard/drafts/list'));
const DraftCreatePage = lazy(() => import('src/pages/dashboard/drafts/new'));
const DraftDetailsPage = lazy(() => import('src/pages/dashboard/drafts/details'));
const DraftEditPage = lazy(() => import('src/pages/dashboard/drafts/edit'));
// --- END DRAFTS IMPORTS ---
// --- STATS - NEW! ---
const StatsOverviewPage = lazy(() => import('src/pages/dashboard/stats/overview-view'));
const PlayerPerformanceView = lazy(() => import('src/pages/dashboard/stats/player-performance'));
const GameDetailsStatsView = lazy(() => import('src/pages/dashboard/stats/game-stats-page'));
const EnterStatsPage = lazy(() => import('src/pages/dashboard/stats/enter-stats-page'));
const ManageKpisPage = lazy(() => import('src/pages/dashboard/stats/manage-kpis-page'));

// --- TRIVIA MANAGER - NEW! ---
const TriviaManagerPage = lazy(() => import('src/pages/dashboard/trivia/trivia-manager'));
const TriviaGamePortalPage = lazy(() => import('src/sections/trivia/trivia-game-portal-view'));
// --- END TRIVIA MANAGER IMPORTS ---

// --- END STATS IMPORTS ---
// ----------------------------------------------------------------------

function SuspenseOutlet() {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}

const dashboardLayout = () => (
  <DashboardLayout>
    <SuspenseOutlet />
  </DashboardLayout>
);

const accountLayout = () => (
  <AccountLayout>
    <SuspenseOutlet />
  </AccountLayout>
);

export const dashboardRoutes = [
  {
    path: 'dashboard',
    element: CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'ecommerce', element: <OverviewEcommercePage /> },
      { path: 'analytics', element: <OverviewAnalyticsPage /> },
      { path: 'banking', element: <OverviewBankingPage /> },
      { path: 'booking', element: <OverviewBookingPage /> },
      { path: 'file', element: <OverviewFilePage /> },
      { path: 'course', element: <OverviewCoursePage /> },
      {
        path: 'user',
        children: [
          // { index: true, element: <UserProfilePage /> }, // This can now be covered by profile/:userId if desired, or keep for current user's general profile
          { path: 'profile', element: <UserProfilePage /> }, // Current user's profile
          { path: 'cards', element: <UserCardsPage /> },
          { path: 'list', element: <UserListPage /> },
          { path: 'new', element: <UserCreatePage /> },
          { path: ':id/edit', element: <UserEditPage /> },
          { path: ':userId', element: <UserProfileViewPage /> }, // <--- NEW DYNAMIC ROUTE FOR USER PROFILE VIEW
          {
            path: 'account',
            element: accountLayout(),
            children: [
              { index: true, element: <AccountGeneralPage /> },
              { path: 'billing', element: <AccountBillingPage /> },
              { path: 'notifications', element: <AccountNotificationsPage /> },
              { path: 'socials', element: <AccountSocialsPage /> },
              { path: 'change-password', element: <AccountChangePasswordPage /> },
              { path: 'achievements', element: <AccountAchievementsPage /> },
              { path: 'merits', element: <AccountMeritsPage /> },
              { path: '3d-avatar', element: <Account3DAvatarPage /> },
            ],
          },
        ],
      },
      {
        path: 'product',
        children: [
          { index: true, element: <ProductListPage /> },
          { path: 'list', element: <ProductListPage /> },
          { path: ':id', element: <ProductDetailsPage /> },
          { path: 'new', element: <ProductCreatePage /> },
          { path: ':id/edit', element: <ProductEditPage /> },
        ],
      },
      {
        path: 'order',
        children: [
          { index: true, element: <OrderListPage /> },
          { path: 'list', element: <OrderListPage /> },
          { path: ':id', element: <OrderDetailsPage /> },
        ],
      },
      {
        path: 'invoice',
        children: [
          { index: true, element: <InvoiceListPage /> },
          { path: 'list', element: <InvoiceListPage /> },
          { path: ':id', element: <InvoiceDetailsPage /> },
          { path: ':id/edit', element: <InvoiceEditPage /> },
          { path: 'new', element: <InvoiceCreatePage /> },
        ],
      },
      {
        path: 'post',
        children: [
          { index: true, element: <BlogPostsPage /> },
          { path: 'list', element: <BlogPostsPage /> },
          { path: ':title', element: <BlogPostPage /> },
          { path: ':title/edit', element: <BlogEditPostPage /> },
          { path: 'new', element: <BlogNewPostPage /> },
        ],
      },
      {
        path: 'job',
        children: [
          { index: true, element: <JobListPage /> },
          { path: 'list', element: <JobListPage /> },
          { path: ':id', element: <JobDetailsPage /> },
          { path: 'new', element: <JobCreatePage /> },
          { path: ':id/edit', element: <JobEditPage /> },
        ],
      },
      {
        path: 'tour',
        children: [
          { index: true, element: <TourListPage /> },
          { path: 'list', element: <TourListPage /> },
          { path: ':id', element: <TourDetailsPage /> },
          { path: 'new', element: <TourCreatePage /> },
          { path: ':id/edit', element: <TourEditPage /> },
        ],
      },
      { path: 'file-manager', element: <FileManagerPage /> },
      { path: 'mail', element: <MailPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'kanban', element: <KanbanPage /> },
      { path: 'permission', element: <PermissionDeniedPage /> },
      { path: 'params', element: <ParamsPage /> },
      { path: 'blank', element: <BlankPage /> },
      // Organization Routes
      {
        path: 'organizations',
        children: [
          { index: true, element: <OrganizationsListPage /> },
          { path: 'list', element: <OrganizationsListPage /> },
          { path: 'create', element: <CreateOrganizationPage /> },
        ],
      },
      // Games Routes
      {
        path: 'games',
        children: [
          // **IMPORTANT: Place specific routes before generic ones**
          { path: 'trivia-manager', element: <TriviaManagerPage /> }, // Keep this here
          { path: 'trivia-play', element: <TriviaGamePortalPage /> }, // <--- ADD THIS NEW ROUTE HERE AND ENSURE IT'S BEFORE ':id'

          { index: true, element: <GameListPage /> },
          { path: 'list', element: <GameListPage /> },
          { path: 'new', element: <GameCreatePage /> },
          { path: ':gameId/achievements', element: <GameAchievementsPage /> }, // More specific than :id, but generally fine if its /games/UUID/achievements
          { path: ':id/edit', element: <GameEditPage /> }, // More specific than :id
          { path: ':id', element: <GameDetailsPage /> }, // <-- This general route should be LAST
        ],
      },
      // Teams Routes
      {
        path: 'teams',
        children: [
          { index: true, element: <TeamListPage /> },
          { path: 'list', element: <TeamListPage /> },
          { path: 'new', element: <TeamCreatePage /> },
          { path: ':id', element: <TeamDetailsPage /> },
          { path: ':id/edit', element: <TeamEditPage /> },
        ],
      },
      {
        // --- ADDED DRAFTS ROUTES ---
        path: 'drafts',
        children: [
          { index: true, element: <DraftListPage /> },
          { path: 'list', element: <DraftListPage /> },
          { path: 'new', element: <DraftCreatePage /> },
          { path: ':id', element: <DraftDetailsPage /> },
          { path: ':id/edit', element: <DraftEditPage /> },
        ],
      },
      {
        path: 'stats', // Corresponds to /dashboard/stats
        element: <Outlet />,
        children: [
          { index: true, element: <StatsOverviewPage /> }, // Default for /dashboard/stats
          { path: 'overview', element: <StatsOverviewPage /> }, // Specific route for overview
          { path: 'players', element: <PlayerPerformanceView /> }, // Placeholder for player stats
          { path: 'game/:id', element: <GameDetailsStatsView /> }, // Placeholder for specific game stats
          { path: 'enter', element: <EnterStatsPage /> }, // Route for new game stats (no gameId)
          { path: 'enter/:gameId', element: <EnterStatsPage /> }, // Route for editing existing game stats by Game ID
          { path: 'kpis/manage', element: <ManageKpisPage /> }, // <--- NEW ROUTE FOR MANAGING ALL KPIs
        ],
      },
      // --- END ADDED DRAFTS ROUTES ---
    ],
  },
];
