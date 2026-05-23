import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, MapPin, Shield, UserPlus } from "lucide-react";

const DIRECTORY_PAGE_SIZES = [15, 25, 50, 100];
import { Modal } from "../components/Modal.jsx";
import PlayerEditorPage from "./PlayerEditorPage.jsx";
import { ES_MX_PLAYERS_HUB as H } from "../locale/esMXPlayersHub.js";
import "./GestionUsuarios.css";

function getUserAvatarUrl(user) {
  const avatarValue = String(
    user?.photoThumbnailUrl
      || user?.photoThumbnail
      || user?.photo
      || user?.avatarUrl
      || user?.avatar
      || user?.imageUrl
      || user?.profileImage
      || "",
  ).trim();

  const loweredAvatar = avatarValue.toLowerCase();
  if (!avatarValue || ["null", "undefined", "nan", "[object object]"].includes(loweredAvatar) || avatarValue.includes("\\fakepath\\")) {
    return "";
  }
  return avatarValue;
}

function getUserInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0][0] || "?").toUpperCase();
}

function UserAvatar({ user, className = "", style = {}, size }) {
  const avatarUrl = getUserAvatarUrl(user);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const initials = getUserInitials(user?.name);
  const avatarStyle = size ? { ...style, width: size, height: size } : style;

  return (
    <span className={`avatar-circle ${className}`.trim()} style={avatarStyle}>
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={`Avatar de ${user?.name || "Player"}`}
          className="avatar-circle-image"
          onError={() => setImageFailed(true)}
        />
      ) : initials}
    </span>
  );
}

const HUB_VIEWS = [
  { id: "directory", label: "Directorio", icon: LayoutGrid },
  { id: "organization", label: "Organización", icon: MapPin },
  { id: "roles", label: "Roles", icon: Shield },
];

export default function GestionUsuarios({ contexto }) {
  const {
    creatableRoles,
    allRoles,
    customRoles,
    openCreateUser,
    actionPermissions,
    Plus,
    userStats,
    filteredUsers,
    userSearch,
    setUserSearch,
    Search,
    userRoleFilter,
    setUserRoleFilter,
    USER_ROLES,
    getUserJobTitle,
    getUserArea,
    getRoleBadgeClass,
    userMap,
    toggleUserActive,
    openEditUser,
    setDeleteUserId,
    setTransferLeadTargetId,
    BOOTSTRAP_MASTER_ID,
    usersByAreaGroups,
    boardAssignmentsByUser,
    usersCreatedByMap,
    usersByCreatorGroups,
    currentUser,
    Pencil,
    Trash2,
    roleModalOpen,
    roleModalName,
    setRoleModalName,
    roleModalEditId,
    roleModalError,
    roleSaving,
    openCreateRoleModal,
    openEditRoleModal,
    submitRoleModal,
    handleDeleteCustomRole,
    setRoleModalOpen,
    deleteArea,
    handleAddAreaOption,
    ROLE_LEAD,
    permissionRegistryStats = {},
    playerEditor = null,
  } = contexto;

  const isPlayerEditorOpen = Boolean(playerEditor?.userModal?.open);

  const [hubView, setHubView] = useState("directory");
  const [directoryLayout, setDirectoryLayout] = useState("table");
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState(25);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [creatorSearch, setCreatorSearch] = useState("");
  const [activeAreaTab, setActiveAreaTab] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const creatorGroups = Array.isArray(usersByCreatorGroups) ? usersByCreatorGroups : [];
  const areaGroups = Array.isArray(usersByAreaGroups) ? usersByAreaGroups : [];

  const activeCreatorGroup = useMemo(() => {
    if (!creatorGroups.length) return null;
    return creatorGroups.find((group) => group.creatorId === selectedCreatorId) || creatorGroups[0];
  }, [creatorGroups, selectedCreatorId]);

  const activeAreaGroup = useMemo(() => {
    if (!areaGroups.length) return null;
    const key = activeAreaTab ?? areaGroups[0]?.area;
    return areaGroups.find((g) => g.area === key) || areaGroups[0];
  }, [areaGroups, activeAreaTab]);

  const creatorFilteredUsers = useMemo(() => {
    if (!activeCreatorGroup) return [];
    const term = creatorSearch.trim().toLowerCase();
    if (!term) return activeCreatorGroup.users;
    return activeCreatorGroup.users.filter((user) => {
      const area = String(getUserArea(user) || "").toLowerCase();
      const jobTitle = String(getUserJobTitle(user) || "").toLowerCase();
      const name = String(user.name || "").toLowerCase();
      const email = String(user.email || "").toLowerCase();
      return name.includes(term) || email.includes(term) || area.includes(term) || jobTitle.includes(term);
    });
  }, [activeCreatorGroup, creatorSearch, getUserArea, getUserJobTitle]);

  const orgDisplayUsers = useMemo(() => {
    if (selectedCreatorId && activeCreatorGroup) return creatorFilteredUsers;
    return activeAreaGroup?.users || [];
  }, [selectedCreatorId, activeCreatorGroup, creatorFilteredUsers, activeAreaGroup]);

  const listUsers = hubView === "directory" ? filteredUsers : orgDisplayUsers;

  useEffect(() => {
    setDirectoryPage(1);
  }, [userSearch, userRoleFilter, creatorSearch, hubView, selectedCreatorId, activeAreaTab, directoryPageSize]);

  const directoryPageCount = Math.max(1, Math.ceil(listUsers.length / directoryPageSize));
  const safeDirectoryPage = Math.min(Math.max(1, directoryPage), directoryPageCount);
  const paginatedListUsers = listUsers.slice(
    (safeDirectoryPage - 1) * directoryPageSize,
    safeDirectoryPage * directoryPageSize,
  );

  const canPromoteToLead = currentUser?.role === ROLE_LEAD;

  function renderLeadButton(user) {
    if (!canPromoteToLead || user.role === ROLE_LEAD) return null;
    return (
      <button
        type="button"
        className="players-tbl-btn players-tbl-btn--lead"
        onClick={() => setTransferLeadTargetId(user.id)}
        title="Designar como Lead principal del sistema"
      >
        Hacer Lead
      </button>
    );
  }

  function renderPaginationFooter() {
    if (listUsers.length <= directoryPageSize) return null;
    return (
      <div className="players-table-footer" style={{ marginTop: "0.5rem", borderRadius: "12px", border: "1px solid var(--ph-border, #cbd5e1)" }}>
        <span>
          Mostrando {(safeDirectoryPage - 1) * directoryPageSize + 1}–{Math.min(safeDirectoryPage * directoryPageSize, listUsers.length)} de {listUsers.length}
        </span>
        <div className="row-actions compact">
          <button type="button" className="user-row-button" disabled={safeDirectoryPage <= 1} onClick={() => setDirectoryPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <span>Pág. {safeDirectoryPage} / {directoryPageCount}</span>
          <button type="button" className="user-row-button" disabled={safeDirectoryPage >= directoryPageCount} onClick={() => setDirectoryPage((p) => Math.min(directoryPageCount, p + 1))}>Siguiente</button>
        </div>
      </div>
    );
  }

  function renderPlayerTable(users, { showArea = true } = {}) {
    return (
      <div className="players-table-wrap">
        <table className="players-table-compact users-table-clean">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cargo</th>
              {showArea ? <th>Área</th> : null}
              <th>Rol</th>
              <th>Referencia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-name-cell">
                    <UserAvatar user={user} size={32} />
                    <div>
                      <strong>{user.name}</strong>
                      <span className="subtle-line">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>{getUserJobTitle(user) || "—"}</td>
                {showArea ? <td>{getUserArea(user) || "—"}</td> : null}
                <td><span className={`user-role-badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span></td>
                <td>{userMap.get(user.managerId)?.name || "—"}</td>
                <td>
                  <button
                    type="button"
                    className={user.isActive ? "user-status-toggle active" : "user-status-toggle"}
                    onClick={() => toggleUserActive(user.id)}
                  >
                    <span className="user-status-dot" />
                    {user.isActive ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td>
                  <div className="players-table-actions">
                    <button type="button" className="players-tbl-btn players-tbl-btn--edit" onClick={() => openEditUser(user)} disabled={!actionPermissions.editUsers}>
                      <Pencil size={14} /> Editar
                    </button>
                    {renderLeadButton(user)}
                    {user.createdById !== BOOTSTRAP_MASTER_ID ? (
                      <button type="button" className="players-tbl-btn players-tbl-btn--delete" onClick={() => setDeleteUserId(user.id)} disabled={!actionPermissions.deleteUsers}>
                        <Trash2 size={14} /> Eliminar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? <p className="players-empty-state">No hay perfiles en esta vista.</p> : null}
      </div>
    );
  }

  function renderPlayerCard(user, { showArea = true } = {}) {
    return (
      <article
        key={user.id}
        className="players-profile-card"
        onClick={() => setViewingPlayer(user)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setViewingPlayer(user);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="players-profile-card-head">
          <UserAvatar user={user} size={44} />
          <div>
            <strong>{user.name}</strong>
            <div className="players-profile-meta">
              <span>{user.email}</span>
            </div>
          </div>
        </div>
        <div className="players-profile-meta">
          <span className={`user-role-badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
          {showArea ? <span>{getUserArea(user) || "Sin área"}</span> : null}
          <span>{getUserJobTitle(user) || "Sin cargo"}</span>
        </div>
        <div className="players-profile-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={user.isActive ? "" : "danger"}
            onClick={() => toggleUserActive(user.id)}
          >
            {user.isActive ? "Activo" : "Inactivo"}
          </button>
          <button type="button" onClick={() => openEditUser(user)} disabled={!actionPermissions.editUsers}>
            <Pencil size={13} /> Editar
          </button>
          {renderLeadButton(user)}
          {user.createdById !== BOOTSTRAP_MASTER_ID ? (
            <button type="button" className="danger" onClick={() => setDeleteUserId(user.id)} disabled={!actionPermissions.deleteUsers}>
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  if (isPlayerEditorOpen) {
    return (
      <section className="players-editor-page-root">
        <PlayerEditorPage editor={playerEditor} />
      </section>
    );
  }

  return (
    <section className="players-command-center">
      <aside className="players-command-rail">
        <div>
          <h2>Players</h2>
          <p>{H.intro}</p>
        </div>

        <div className="players-rail-stats">
          <div className="players-rail-stat">
            <strong>{userStats.total}</strong>
            <span>Total</span>
          </div>
          <div className="players-rail-stat">
            <strong>{userStats.active}</strong>
            <span>Activos</span>
          </div>
          <div className="players-rail-stat">
            <strong>{permissionRegistryStats.sections ?? 0}</strong>
            <span>Secciones</span>
          </div>
          <div className="players-rail-stat">
            <strong>{permissionRegistryStats.actions ?? 0}</strong>
            <span>Acciones</span>
          </div>
        </div>

        <nav className="players-rail-nav" aria-label="Vistas de Players">
          {HUB_VIEWS.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                type="button"
                className={hubView === view.id ? "active" : ""}
                onClick={() => setHubView(view.id)}
              >
                <Icon size={16} />
                {view.label}
              </button>
            );
          })}
        </nav>

      </aside>

      <div className="players-main-panel">
        <div className="players-action-bar">
          {creatableRoles.length ? (
            <button type="button" className="primary-button" onClick={openCreateUser} disabled={!actionPermissions.createUsers}>
              <UserPlus size={16} /> Nuevo perfil
            </button>
          ) : null}
          {actionPermissions.managePermissions ? (
            <button type="button" className="primary-button" onClick={openCreateRoleModal}>
              <Plus size={16} /> Nuevo rol
            </button>
          ) : null}
          {(hubView === "directory" || hubView === "organization") ? (
            <>
              <button
                type="button"
                className={`players-btn-secondary ${directoryLayout === "table" ? "active" : ""}`}
                onClick={() => setDirectoryLayout("table")}
              >
                <List size={15} /> Tabla compacta
              </button>
              <button
                type="button"
                className={`players-btn-secondary ${directoryLayout === "cards" ? "active" : ""}`}
                onClick={() => setDirectoryLayout("cards")}
              >
                <LayoutGrid size={15} /> Tarjetas
              </button>
            </>
          ) : null}
        </div>

        {(hubView === "directory" || hubView === "organization") ? (
          <div className="players-toolbar-card">
            <label>
              <span>Buscar player</span>
              <div className="players-search-wrap">
                <Search size={16} />
                <input
                  value={hubView === "organization" ? creatorSearch : userSearch}
                  onChange={(event) => {
                    if (hubView === "organization") setCreatorSearch(event.target.value);
                    else setUserSearch(event.target.value);
                  }}
                  placeholder="Nombre, correo, área o cargo"
                />
              </div>
            </label>
            {hubView === "directory" ? (
              <label>
                <span>Rol interno</span>
                <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
                  <option>Todos los roles</option>
                  {(allRoles || USER_ROLES).map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
            ) : null}
            <label>
              <span>Por página</span>
              <select
                value={String(directoryPageSize)}
                onChange={(event) => setDirectoryPageSize(Number(event.target.value))}
              >
                {DIRECTORY_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <span className="chip primary">{listUsers.length} visibles</span>
          </div>
        ) : null}

        {hubView === "directory" ? (
          listUsers.length ? (
            directoryLayout === "table"
              ? (
                <>
                  {renderPlayerTable(paginatedListUsers)}
                  {renderPaginationFooter()}
                </>
              )
              : (
                <>
                  <div className="players-directory-grid">
                    {paginatedListUsers.map((user) => renderPlayerCard(user))}
                  </div>
                  {renderPaginationFooter()}
                </>
              )
          ) : (
            <p className="players-empty-state">No hay perfiles que coincidan con el filtro actual.</p>
          )
        ) : null}

        {hubView === "organization" ? (
          <div className="players-org-layout">
            <div className="players-org-sidebar">
              <p className="subtle-line" style={{ marginBottom: "0.65rem", fontWeight: 700 }}>Por área</p>
              <div className="players-org-chip-list">
                {areaGroups.map((group) => (
                  <button
                    key={group.area}
                    type="button"
                    className={`players-org-chip ${(activeAreaGroup?.area || "") === group.area ? "active" : ""}`}
                    onClick={() => {
                      setActiveAreaTab(group.area);
                      setSelectedCreatorId("");
                    }}
                  >
                    <span>{group.area}</span>
                    <span className="chip">{group.users.length}</span>
                  </button>
                ))}
              </div>
              {creatorGroups.length ? (
                <>
                  <p className="subtle-line" style={{ margin: "1rem 0 0.65rem", fontWeight: 700 }}>Por creador</p>
                  <div className="players-org-chip-list">
                    {creatorGroups.map((group) => (
                      <button
                        key={group.creatorId}
                        type="button"
                        className={`players-org-chip ${(activeCreatorGroup?.creatorId || "") === group.creatorId ? "active" : ""}`}
                        onClick={() => {
                          setSelectedCreatorId(group.creatorId);
                          setCreatorSearch("");
                        }}
                      >
                        <span>{group.creatorName}</span>
                        <span className="chip">{group.users.length}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              {currentUser?.role === ROLE_LEAD && activeAreaGroup ? (
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button type="button" className="icon-button area-add-button" title="Agregar área" onClick={() => handleAddAreaOption()}>
                    <Plus size={14} />
                  </button>
                  <button type="button" className="icon-button danger" title="Eliminar área" onClick={() => deleteArea(activeAreaGroup.area)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </div>
            <div>
              <div className="card-header-row" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <strong>
                    {activeCreatorGroup && selectedCreatorId
                      ? activeCreatorGroup.creatorName
                      : activeAreaGroup?.area || "Selecciona un grupo"}
                  </strong>
                  <p className="subtle-line">{orgDisplayUsers.length} perfil(es)</p>
                </div>
              </div>
              {orgDisplayUsers.length ? (
                directoryLayout === "table"
                  ? (
                    <>
                      {renderPlayerTable(paginatedListUsers, { showArea: !selectedCreatorId })}
                      {renderPaginationFooter()}
                    </>
                  )
                  : (
                    <>
                      <div className="players-directory-grid">
                        {paginatedListUsers.map((user) => renderPlayerCard(user, { showArea: !selectedCreatorId }))}
                      </div>
                      {renderPaginationFooter()}
                    </>
                  )
              ) : (
                <p className="players-empty-state">No hay players en este grupo.</p>
              )}
            </div>
          </div>
        ) : null}

        {hubView === "roles" && actionPermissions.managePermissions ? (
          customRoles.length ? (
            <div className="players-roles-grid">
              {customRoles.map((role) => (
                <div key={role.id} className="players-role-card">
                  <div>
                    <strong>{role.name}</strong>
                    <p className="subtle-line" style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
                      Creado {new Date(role.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button type="button" className="icon-button" title="Editar" onClick={() => openEditRoleModal(role)}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="icon-button danger" title="Eliminar" onClick={() => handleDeleteCustomRole(role.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="players-empty-state">Aún no hay roles personalizados. Crea uno desde el panel lateral.</p>
          )
        ) : null}
      </div>

      <Modal
        open={Boolean(viewingPlayer)}
        title="Detalle del player"
        confirmLabel="Cerrar"
        hideCancel
        onClose={() => setViewingPlayer(null)}
        onConfirm={() => setViewingPlayer(null)}
      >
        {viewingPlayer ? (
          <div className="modal-form-grid">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <UserAvatar user={viewingPlayer} size={44} style={{ fontSize: "1.2rem" }} />
              <div>
                <strong style={{ fontSize: "1rem" }}>{viewingPlayer.name}</strong>
                <p className="subtle-line">{viewingPlayer.email}</p>
              </div>
            </div>
            <p className="subtle-line">Área · {getUserArea(viewingPlayer) || "Sin área"}</p>
            <p className="subtle-line">Cargo · {getUserJobTitle(viewingPlayer) || "Sin cargo"}</p>
            <p className="subtle-line">Rol interno · <span className={`user-role-badge ${getRoleBadgeClass(viewingPlayer.role)}`}>{viewingPlayer.role}</span></p>
            <p className="subtle-line">Estado · <span className={viewingPlayer.isActive ? "chip success" : "chip"} style={{ display: "inline" }}>{viewingPlayer.isActive ? "Activo" : "Inactivo"}</span></p>
            <p className="subtle-line">Referencia · {userMap.get(viewingPlayer.managerId)?.name || "Sin asignar"}</p>
            <p className="subtle-line">Creado por · {userMap.get(viewingPlayer.createdById)?.name || "Sin registro"}</p>
            <p className="subtle-line">Tableros asignados · {boardAssignmentsByUser.get(viewingPlayer.id) || 0}</p>
            <p className="subtle-line">Perfiles creados · {usersCreatedByMap.get(viewingPlayer.id) || 0}</p>
            <div className="row-actions compact" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="user-row-button" onClick={() => { openEditUser(viewingPlayer); setViewingPlayer(null); }} disabled={!actionPermissions.editUsers}>
                <Pencil size={15} /> Editar perfil
              </button>
              {canPromoteToLead && viewingPlayer.role !== ROLE_LEAD ? (
                <button type="button" className="players-btn-lead" onClick={() => { setTransferLeadTargetId(viewingPlayer.id); setViewingPlayer(null); }}>
                  Hacer Lead principal
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={roleModalOpen}
        title={roleModalEditId ? "Editar rol personalizado" : "Nuevo rol personalizado"}
        confirmLabel={roleSaving ? "Guardando…" : roleModalEditId ? "Guardar cambios" : "Crear rol"}
        cancelLabel="Cancelar"
        onClose={() => setRoleModalOpen(false)}
        onConfirm={submitRoleModal}
        confirmDisabled={roleSaving || !roleModalName.trim()}
      >
        <div className="modal-form-grid">
          <label className="app-modal-field app-modal-field-full">
            <span>Nombre del rol</span>
            <input
              type="text"
              placeholder="Ej. Auditor, Coordinador regional…"
              value={roleModalName}
              onChange={(e) => setRoleModalName(e.target.value)}
              autoFocus
            />
          </label>
          {roleModalError ? <p className="validation-text app-modal-field-full">{roleModalError}</p> : null}
        </div>
      </Modal>
    </section>
  );
}
