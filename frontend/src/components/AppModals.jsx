import { AppBoardModals } from "./app-modals/AppBoardModals.jsx";
import { AppBoardToolModals } from "./app-modals/AppBoardToolModals.jsx";
import { AppCatalogModals } from "./app-modals/AppCatalogModals.jsx";
import { AppInventoryModals } from "./app-modals/AppInventoryModals.jsx";
import { AppPauseModals } from "./app-modals/AppPauseModals.jsx";
import { AppUserModals } from "./app-modals/AppUserModals.jsx";
import { withModalContextDefaults } from "../app/modalContextDefaults.js";

export function AppModals(props) {
  const modalProps = withModalContextDefaults(props);
  return (
    <>
      <AppPauseModals {...modalProps} />
      <AppBoardModals {...modalProps} />
      <AppCatalogModals {...modalProps} />
      <AppBoardToolModals {...modalProps} />
      <AppUserModals {...modalProps} />
      <AppInventoryModals {...modalProps} />
    </>
  );
}
