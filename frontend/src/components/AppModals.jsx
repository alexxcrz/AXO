import { AppBoardModals } from "./app-modals/AppBoardModals.jsx";
import { AppBoardToolModals } from "./app-modals/AppBoardToolModals.jsx";
import { AppCatalogModals } from "./app-modals/AppCatalogModals.jsx";
import { AppInventoryModals } from "./app-modals/AppInventoryModals.jsx";
import { AppPauseModals } from "./app-modals/AppPauseModals.jsx";
import { AppUserModals } from "./app-modals/AppUserModals.jsx";

export function AppModals(props) {
  return (
    <>
      <AppBoardModals {...props} />
      <AppBoardToolModals {...props} />
      <AppCatalogModals {...props} />
      <AppInventoryModals {...props} />
      <AppPauseModals {...props} />
      <AppUserModals {...props} />
    </>
  );
}
