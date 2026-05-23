import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ES_MX_PERMISSIONS as T } from "../locale/esMXPermissions.js";
import { getActionLabelEsMX } from "../locale/actionLabelsEsMX.js";
import "./UserPermissionsPanel.css";

const SUBTAB_PALETTE = ["rose", "violet", "amber", "teal", "sky", "indigo", "orange"];

function subtabPaletteIndex(id, index) {
  const key = String(id || index || 0);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i)) % SUBTAB_PALETTE.length;
  return hash;
}

const SECTION_LABEL_OVERRIDES = {
  "players-admin": "PLAYERS (ESTA P\u00c1GINA)",
};

function resolveLabel(item) {
  if (item?.id && SECTION_LABEL_OVERRIDES[item.id]) return SECTION_LABEL_OVERRIDES[item.id];
  return getActionLabelEsMX(item.id, item.label);
}

function sectionPanelId(sectionId) {
  return `area-${sectionId}`;
}

function countEnabledTabs(section, permissionOverrides) {
  return section.itemPermissions.filter((tab) => (
    tab.kind === "pages"
      ? Boolean(permissionOverrides.pages?.[tab.id])
      : Boolean(permissionOverrides.actions?.[tab.id])
  )).length;
}

function PermissionToggleChip({ label, enabled, delegable, onToggle, title }) {
  return (
    <label className={`perm-toggle-chip ${enabled ? "is-on" : ""} ${!delegable ? "is-locked" : ""}`} title={title}>
      <span className="perm-toggle-chip-label">{label}</span>
      <button
        type="button"
        disabled={!delegable}
        className={`switch-button perm-switch ${enabled ? "on" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
        aria-pressed={enabled}
      >
        <span className="switch-thumb" />
      </button>
    </label>
  );
}

function PermissionTabPanel({
  tab,
  sectionTone,
  permissionOverrides,
  canGrantManagedPermission,
  onTogglePermission,
}) {
  const enabled = tab.kind === "pages"
    ? Boolean(permissionOverrides.pages?.[tab.id])
    : Boolean(permissionOverrides.actions?.[tab.id]);
  const delegable = canGrantManagedPermission(tab.kind, tab.id);
  const nestedActions = tab.actionPermissions || [];
  const subTabs = tab.subTabs || [];

  return (
    <article className={`perm-tab-panel perm-tab-panel--${sectionTone} ${enabled ? "is-on" : ""}`}>
      <header className="perm-tab-panel-head">
        <div>
          <span className={`perm-level-tag tab perm-level-tag--${sectionTone}`}>{T.levelTab}</span>
          <strong>{resolveLabel(tab)}</strong>
        </div>
        <PermissionToggleChip
          label={enabled ? T.active : T.inactive}
          enabled={enabled}
          delegable={delegable}
          onToggle={() => onTogglePermission(tab.kind, tab.id)}
          title={delegable ? T.enableTab : T.notDelegable}
        />
      </header>

      {subTabs.length > 0 ? (
        <div className="perm-subtab-panels">
          {subTabs.map((sub, subIndex) => {
            const palette = SUBTAB_PALETTE[subtabPaletteIndex(sub.id, subIndex)];
            return (
              <div key={sub.id} className={`perm-subtab-panel perm-subtab-panel--${palette}`}>
                <div className="perm-subtab-panel-title">
                  <span className={`perm-level-tag subtab perm-level-tag--${palette}`}>{T.levelSubtab}</span>
                  <strong>{resolveLabel(sub)}</strong>
                </div>
                <div className="perm-action-grid">
                  {(sub.actionPermissions || []).map((actionItem) => (
                    <PermissionToggleChip
                      key={actionItem.id}
                      label={resolveLabel(actionItem)}
                      enabled={Boolean(permissionOverrides.actions?.[actionItem.id])}
                      delegable={canGrantManagedPermission("actions", actionItem.id)}
                      onToggle={() => onTogglePermission("actions", actionItem.id)}
                      title={T.actionInTab}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {nestedActions.length > 0 ? (
        <div className="perm-tab-panel-actions">
          <p className="perm-block-label">{T.tabActions}</p>
          <div className="perm-action-grid">
            {nestedActions.map((actionItem) => (
              <PermissionToggleChip
                key={actionItem.id}
                label={resolveLabel(actionItem)}
                enabled={Boolean(permissionOverrides.actions?.[actionItem.id])}
                delegable={canGrantManagedPermission("actions", actionItem.id)}
                onToggle={() => onTogglePermission("actions", actionItem.id)}
                title={T.actionInTab}
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function PermissionSectionDetail({
  section,
  sectionIndex,
  permissionOverrides,
  canGrantManagedPermission,
  onTogglePermission,
}) {
  const sectionTone = SUBTAB_PALETTE[sectionIndex % SUBTAB_PALETTE.length];
  const sectionLabel = resolveLabel(section);
  const navEnabled = section.navVisibilityKind === "pages"
    ? Boolean(permissionOverrides.pages?.[section.navVisibilityActionId])
    : Boolean(permissionOverrides.actions?.[section.navVisibilityActionId]);
  const navDelegable = canGrantManagedPermission(section.navVisibilityKind, section.navVisibilityActionId);

  return (
    <div className={`perm-detail perm-detail--${sectionTone}`}>
      <header className="perm-detail-head">
        <div>
          <span className={`perm-level-tag section perm-level-tag--${sectionTone}`}>{T.levelSection}</span>
          <h5>{sectionLabel}</h5>
          <p>{T.tabsActive(countEnabledTabs(section, permissionOverrides), section.itemPermissions.length)}</p>
        </div>
      </header>

      <div className={`perm-detail-nav perm-detail-nav--${sectionTone}`}>
        <div>
          <span className={`perm-level-tag perm-level-tag--${sectionTone}`}>{T.levelLateral}</span>
          <strong>{T.seeSectionNav}</strong>
          <p>
            {navDelegable ? T.showSectionNav(sectionLabel) : T.cannotDelegateSection}
          </p>
        </div>
        <PermissionToggleChip
          label={navEnabled ? T.navActive : T.navBlocked}
          enabled={navEnabled}
          delegable={navDelegable}
          onToggle={() => onTogglePermission(section.navVisibilityKind, section.navVisibilityActionId)}
        />
      </div>

      <div className="perm-detail-tabs">
        <p className="perm-block-label">{T.explorerTabsTitle}</p>
        <div className="perm-tabs-matrix">
          {section.itemPermissions.map((tab) => (
            <PermissionTabPanel
              key={tab.id}
              tab={tab}
              sectionTone={sectionTone}
              permissionOverrides={permissionOverrides}
              canGrantManagedPermission={canGrantManagedPermission}
              onTogglePermission={onTogglePermission}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PermissionExplorer({
  menuPermissionSections,
  activePageId,
  permissionOverrides,
  canGrantManagedPermission,
  onToggleSection,
  onTogglePermission,
}) {
  const [sectionQuery, setSectionQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = sectionQuery.trim().toLowerCase();
    if (!q) return menuPermissionSections;
    return menuPermissionSections.filter((section) => resolveLabel(section).toLowerCase().includes(q));
  }, [menuPermissionSections, sectionQuery]);

  const activeSection = useMemo(() => {
    const match = menuPermissionSections.find((section) => sectionPanelId(section.id) === activePageId);
    return match || menuPermissionSections[0] || null;
  }, [menuPermissionSections, activePageId]);

  const activeIndex = activeSection
    ? menuPermissionSections.findIndex((section) => section.id === activeSection.id)
    : 0;

  return (
    <div className="perm-explorer">
      <aside className="perm-explorer-nav">
        <div className="perm-explorer-nav-head">
          <strong>{T.explorerNavTitle}</strong>
          <span className="chip">{menuPermissionSections.length}</span>
        </div>
        <label className="perm-explorer-search">
          <Search size={15} />
          <input
            type="search"
            value={sectionQuery}
            onChange={(event) => setSectionQuery(event.target.value)}
            placeholder={T.searchSection}
          />
        </label>
        <div className="perm-explorer-nav-list" role="tablist" aria-label={T.explorerNavTitle}>
          {filteredSections.map((section) => {
            const panelId = sectionPanelId(section.id);
            const isActive = activePageId === panelId || (!activePageId && section.id === menuPermissionSections[0]?.id);
            const navOn = section.navVisibilityKind === "pages"
              ? Boolean(permissionOverrides.pages?.[section.navVisibilityActionId])
              : Boolean(permissionOverrides.actions?.[section.navVisibilityActionId]);
            const enabledTabs = countEnabledTabs(section, permissionOverrides);
            const sectionIndex = menuPermissionSections.findIndex((item) => item.id === section.id);
            const tone = SUBTAB_PALETTE[sectionIndex % SUBTAB_PALETTE.length];

            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`perm-explorer-nav-item perm-explorer-nav-item--${tone} ${isActive ? "active" : ""} ${navOn ? "has-access" : ""}`}
                onClick={() => onToggleSection(panelId)}
              >
                <span className="perm-explorer-nav-label">{resolveLabel(section)}</span>
                <span className="perm-explorer-nav-meta">
                  <span className={`perm-explorer-dot ${navOn ? "on" : ""}`} aria-hidden />
                  {enabledTabs}/{section.itemPermissions.length}
                </span>
              </button>
            );
          })}
        </div>
        {!filteredSections.length ? (
          <p className="perm-explorer-empty">{T.noSectionMatch}</p>
        ) : null}
      </aside>

      <div className="perm-explorer-main">
        {activeSection ? (
          <PermissionSectionDetail
            section={activeSection}
            sectionIndex={activeIndex}
            permissionOverrides={permissionOverrides}
            canGrantManagedPermission={canGrantManagedPermission}
            onTogglePermission={onTogglePermission}
          />
        ) : (
          <p className="perm-explorer-empty">{T.explorerPickSection}</p>
        )}
      </div>
    </div>
  );
}

export function UserPermissionsPanel({
  menuPermissionSections = [],
  userModal,
  expandedPermissionTabs: _expandedPermissionTabs = [],
  expandedDelegationTabs: _expandedDelegationTabs = [],
  canGrantManagedPermission,
  canGrantDelegationKey,
  showDelegationSection = false,
  toggleUserModalPermission,
  toggleUserModalPermissionSection,
  toggleUserModalPermissionTab: _toggleUserModalPermissionTab,
  toggleUserModalDelegation,
  toggleUserModalDelegationSection,
  toggleUserModalDelegationTab: _toggleUserModalDelegationTab,
  toggleUserModalDelegationEnabled,
  editorIsMeta = false,
}) {
  const overrides = userModal?.permissionOverrides || { pages: {}, actions: {} };
  const delegation = userModal?.delegationGrants || { enabled: false, pages: {}, actions: {} };
  const delegationOverrides = { pages: delegation.pages, actions: delegation.actions };

  useEffect(() => {
    const first = menuPermissionSections[0];
    if (!first || userModal?.permissionPageId) return;
    toggleUserModalPermissionSection(sectionPanelId(first.id));
  }, [menuPermissionSections, userModal?.permissionPageId, toggleUserModalPermissionSection]);

  useEffect(() => {
    if (!delegation.enabled || userModal?.delegationPageId) return;
    const first = menuPermissionSections[0];
    if (!first) return;
    toggleUserModalDelegationSection(sectionPanelId(first.id));
  }, [delegation.enabled, menuPermissionSections, userModal?.delegationPageId, toggleUserModalDelegationSection]);

  return (
    <section className="user-modal-permissions perm-panel-v2">
      <div className="perm-panel-intro">
        <div>
          <h4>{T.menuTitle}</h4>
          <p>{T.menuIntro}</p>
        </div>
        <span className="chip primary">{T.sectionsCount(menuPermissionSections.length)}</span>
      </div>

      <PermissionExplorer
        menuPermissionSections={menuPermissionSections}
        activePageId={userModal?.permissionPageId || ""}
        permissionOverrides={overrides}
        canGrantManagedPermission={canGrantManagedPermission}
        onToggleSection={toggleUserModalPermissionSection}
        onTogglePermission={toggleUserModalPermission}
      />

      {showDelegationSection ? (
        <div className="perm-delegation-block">
          <div className="perm-delegation-master">
            <div>
              <strong>{T.delegationEnabled}</strong>
            </div>
            <button
              type="button"
              className={`switch-button perm-switch ${delegation.enabled ? "on" : ""}`}
              onClick={toggleUserModalDelegationEnabled}
              aria-pressed={delegation.enabled}
            >
              <span className="switch-thumb" />
            </button>
          </div>

          {delegation.enabled ? (
            <PermissionExplorer
              menuPermissionSections={menuPermissionSections}
              activePageId={userModal?.delegationPageId || ""}
              permissionOverrides={delegationOverrides}
              canGrantManagedPermission={canGrantDelegationKey}
              onToggleSection={toggleUserModalDelegationSection}
              onTogglePermission={toggleUserModalDelegation}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
