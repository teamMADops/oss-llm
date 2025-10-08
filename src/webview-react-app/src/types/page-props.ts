export interface BasePageProps {
  isSidebarOpen: boolean;
}

export interface ActionPageProps extends BasePageProps {
  actionId: string | null;
}
