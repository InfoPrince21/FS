// src/layouts/dashboard/config-navigation.jsx

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />;

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
  // ADD NEW ICON FOR ORGANIZATIONS
  organizations: icon('ic-parameter'), // Make sure 'ic-building.svg' exists in public/assets/icons/navbar/
  game: icon('ic-analytics'), // You'll need to create 'ic-game.svg' in public/assets/icons/navbar/
  team: icon('ic-analytics'),
  draft: icon('ic-analytics'),
  stats: icon('ic-analytics'),
};

// ----------------------------------------------------------------------

export const navData = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'App', path: paths.dashboard.root, icon: ICONS.dashboard },
      // IMPORTANT: Keeping .general.X because your paths.js confirms this structure
      { title: 'Ecommerce', path: paths.dashboard.general.ecommerce, icon: ICONS.ecommerce },
      { title: 'Analytics', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
      { title: 'Banking', path: paths.dashboard.general.banking, icon: ICONS.banking },
      { title: 'Booking', path: paths.dashboard.general.booking, icon: ICONS.booking },
      { title: 'File', path: paths.dashboard.general.file, icon: ICONS.file },
      { title: 'Course', path: paths.dashboard.general.course, icon: ICONS.course },
    ],
  },
  /**
   * Management
   */
  {
    subheader: 'Management',
    items: [
      {
        title: 'User',
        path: paths.dashboard.user.root,
        icon: ICONS.user,
        children: [
          { title: 'Profile', path: paths.dashboard.user.profile },
          { title: 'Cards', path: paths.dashboard.user.cards },
          { title: 'List', path: paths.dashboard.user.list },
          { title: 'Create', path: paths.dashboard.user.new },
          // Use MOCK_ID from paths.js for demo edit path if it's the pattern you use
          { title: 'Edit', path: paths.dashboard.user.demo.edit },
          { title: 'Account', path: paths.dashboard.user.account }, // Your paths.js shows account directly, not account.general
        ],
      },
      {
        title: 'Product',
        path: paths.dashboard.product.root,
        icon: ICONS.product,
        children: [
          // Paths like .root, .details, .new, .edit seem to be handled by your paths.js for products
          { title: 'List', path: paths.dashboard.product.root }, // List might be root, or you might have a specific list: path
          { title: 'Details', path: paths.dashboard.product.demo.details },
          { title: 'Create', path: paths.dashboard.product.new },
          { title: 'Edit', path: paths.dashboard.product.demo.edit },
        ],
      },
      {
        title: 'Order',
        path: paths.dashboard.order.root,
        icon: ICONS.order,
        children: [
          { title: 'List', path: paths.dashboard.order.root }, // Same as product, check if there's a dedicated list path
          { title: 'Details', path: paths.dashboard.order.demo.details },
        ],
      },
      {
        title: 'Invoice',
        path: paths.dashboard.invoice.root,
        icon: ICONS.invoice,
        children: [
          { title: 'List', path: paths.dashboard.invoice.root },
          { title: 'Details', path: paths.dashboard.invoice.demo.details },
          { title: 'Create', path: paths.dashboard.invoice.new },
          { title: 'Edit', path: paths.dashboard.invoice.demo.edit },
        ],
      },
      {
        title: 'Blog',
        path: paths.dashboard.post.root,
        icon: ICONS.blog,
        children: [
          { title: 'List', path: paths.dashboard.post.root },
          { title: 'Details', path: paths.dashboard.post.demo.details },
          { title: 'Create', path: paths.dashboard.post.new },
          { title: 'Edit', path: paths.dashboard.post.demo.edit },
        ],
      },
      {
        title: 'Job',
        path: paths.dashboard.job.root,
        icon: ICONS.job,
        children: [
          { title: 'List', path: paths.dashboard.job.root },
          { title: 'Details', path: paths.dashboard.job.demo.details },
          { title: 'Create', path: paths.dashboard.job.new },
          { title: 'Edit', path: paths.dashboard.job.demo.edit },
        ],
      },
      {
        title: 'Tour',
        path: paths.dashboard.tour.root,
        icon: ICONS.tour,
        children: [
          { title: 'List', path: paths.dashboard.tour.root },
          { title: 'Details', path: paths.dashboard.tour.demo.details },
          { title: 'Create', path: paths.dashboard.tour.new },
          { title: 'Edit', path: paths.dashboard.tour.demo.edit },
        ],
      },
      { title: 'File manager', path: paths.dashboard.fileManager, icon: ICONS.folder },
      {
        title: 'Mail',
        path: paths.dashboard.mail,
        icon: ICONS.mail,
        info: (
          <Label color="error" variant="inverted">
            +32
          </Label>
        ),
      },
      { title: 'Chat', path: paths.dashboard.chat, icon: ICONS.chat },
      { title: 'Calendar', path: paths.dashboard.calendar, icon: ICONS.calendar },
      { title: 'Kanban', path: paths.dashboard.kanban, icon: ICONS.kanban },
      // ADD THE ORGANIZATIONS SECTION HERE
      {
        title: 'Organizations', // Parent title for organization links
        path: paths.dashboard.organizations.root, // Use the root path for organizations
        icon: ICONS.organizations, // Use the new icon
        children: [
          { title: 'List', path: paths.dashboard.organizations.list }, // Link to your organizations list page
          { title: 'Create', path: paths.dashboard.organizations.create }, // Link to your create page
          // Add other organization links if needed, e.g., view details for a specific organization
          // { title: 'Details', path: paths.dashboard.organizations.details(MOCK_ID) },
        ],
      },
      {
        // NEW: Games Section
        title: 'Games',
        path: paths.dashboard.game.root, // Points to /dashboard/games
        icon: ICONS.game, // Uses the newly defined game icon
        children: [
          { title: 'List', path: paths.dashboard.game.list }, // Points to /dashboard/games/list
          { title: 'Create', path: paths.dashboard.game.new }, // Points to /dashboard/games/new
          { title: 'Achievements', path: paths.dashboard.game.achievements('some-game-id') },
          { title: 'Trivia Manager', path: paths.dashboard.game.triviaManager },
          { title: 'Trivia Game', path: paths.dashboard.game.triviaPlay },
        ],
      },
      {
        // --- ADDED TEAMS SECTION ---
        title: 'Teams',
        path: paths.dashboard.team.root, // Use the root path for teams
        icon: ICONS.team, // Use the new team icon
        children: [
          { title: 'List', path: paths.dashboard.team.list }, // Link to your teams list page
          { title: 'Create', path: paths.dashboard.team.new }, // Link to your create page
        ],
      },
      {
        title: 'Drafts',
        path: paths.dashboard.draft.root,
        icon: ICONS.draft,
        children: [
          { title: 'List', path: paths.dashboard.draft.list },
          { title: 'Create', path: paths.dashboard.draft.new },
        ],
      },
      {
        title: 'Statistics',
        path: paths.dashboard.stats.root, // Points to /dashboard/stats
        icon: ICONS.stats, // Using the new stats icon
        children: [
          { title: 'Overview', path: paths.dashboard.stats.overview }, // Link to the main stats overview
          { title: 'Player Performance', path: paths.dashboard.stats.players }, // Link to player stats
          { title: 'Enter Stats', path: paths.dashboard.stats.enter() }, // Link to the "Enter/Edit Game Stats" page
          { title: 'Manage KPIs', path: paths.dashboard.stats.manageKpis }, // NEW: Link to the "Manage KPIs" page
          // You might not want a direct link for 'Game Details' here since it requires an ID,
          // but you could add a demo link if useful for development.
          // { title: 'Game Details (Demo)', path: paths.dashboard.stats.demo.gameDetails },
        ],
      },
    ],
  },
  /**
   * Item state
   */
  {
    subheader: 'Misc',
    items: [
      {
        title: 'Permission',
        path: paths.dashboard.permission,
        icon: ICONS.lock,
        allowedRoles: ['admin', 'manager'],
        caption: 'Only admin can see this item.',
      },
      {
        title: 'Level',
        path: '#/dashboard/menu_level',
        icon: ICONS.menuItem,
        children: [
          {
            title: 'Level 1a',
            path: '#/dashboard/menu_level/menu_level_1a',
            children: [
              { title: 'Level 2a', path: '#/dashboard/menu_level/menu_level_1a/menu_level_2a' },
              {
                title: 'Level 2b',
                path: '#/dashboard/menu_level/menu_level_1a/menu_level_2b',
                children: [
                  {
                    title: 'Level 3a',
                    path: '#/dashboard/menu_level/menu_level_1a/menu_level_2b/menu_level_3a',
                  },
                  {
                    title: 'Level 3b',
                    path: '#/dashboard/menu_level/menu_level_1a/menu_level_2b/menu_level_3b',
                  },
                ],
              },
            ],
          },
          { title: 'Level 1b', path: '#/dashboard/menu_level/menu_level_1b' },
        ],
      },
      {
        title: 'Disabled',
        path: '#disabled',
        icon: ICONS.disabled,
        disabled: true,
      },
      {
        title: 'Label',
        path: '#label',
        icon: ICONS.label,
        info: (
          <Label
            color="info"
            variant="inverted"
            startIcon={<Iconify icon="solar:bell-bing-bold-duotone" />}
          >
            NEW
          </Label>
        ),
      },
      {
        title: 'Caption',
        path: '#caption',
        icon: ICONS.menuItem,
        caption:
          'Quisque malesuada placerat nisl. In hac habitasse platea dictumst. Cras id dui. Pellentesque commodo eros a enim. Morbi mollis tellus ac sapien.',
      },
      {
        title: 'Params',
        path: '/dashboard/params?id=e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        icon: ICONS.parameter,
      },
      {
        title: 'External link',
        path: 'https://www.google.com/',
        icon: ICONS.external,
        info: <Iconify width={18} icon="eva:external-link-fill" />,
      },
      { title: 'Blank', path: paths.dashboard.blank, icon: ICONS.blank },
    ],
  },
];
