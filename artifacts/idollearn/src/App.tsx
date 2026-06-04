import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import AuthCallbackPage from "@/pages/auth-callback";
import FeedPage from "@/pages/feed";
import AdminPage from "@/pages/admin";
import AdminPreviewPage from "@/pages/admin-preview";
import PostDetailPage from "@/pages/post-detail";
import UpgradePage from "@/pages/upgrade";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/preview/:id" component={AdminPreviewPage} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/post/:id" component={PostDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
