import { useState } from "react";
import ClienteForm from "../components/ClienteForm";
import ClienteList from "../components/ClienteList";
import ClienteFicha from "../components/ClienteFicha";
import DashboardOverview from "../components/DashboardOverview";
import AdminTodayAgenda from "../components/AdminTodayAgenda";
import OSFicha from "../components/OSFicha";
import OSForm from "../components/OSForm";
import OSList from "../components/OSList";
import MonthlyReport from "../components/MonthlyReport";
import ExtintorForm from "../components/ExtintorForm";
import ExtintorList from "../components/ExtintorList";
import ExtintorFicha from "../components/ExtintorFicha";
import RTMForm from "../components/RTMForm";
import RTMList from "../components/RTMList";
import RTMFicha from "../components/RTMFicha";
import TechnicianForm from "../components/TechnicianForm";
import TechnicianList from "../components/TechnicianList";

export default function Dashboard({ user, profile, onLogout }) {
  const [view, setView] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [extintorSelecionado, setExtintorSelecionado] = useState(null);
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [rtmSelecionado, setRtmSelecionado] = useState(null);
  const [technicianRefreshToken, setTechnicianRefreshToken] = useState(0);

  const normalizedRole = profile?.role === "admin" ? "admin" : "tecnico";
  const isAdmin = normalizedRole === "admin";
  const roleLabel = isAdmin ? "Administrador" : "Técnico";

  function resetSelections() {
    setClienteSelecionado(null);
    setExtintorSelecionado(null);
    setOsSelecionada(null);
    setRtmSelecionado(null);
  }

  function goHome() {
    resetSelections();
    setView("");
  }

  function openView(nextView) {
    if (!isAdmin && ["relatorioMensal"].includes(nextView)) {
      setView(nextView);
      return;
    }

    setView(nextView);
  }

  function renderAccessRestricted(title, description) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Acesso restrito"
          title={title}
          description={description}
        />
        <Button onClick={goHome} variant="secondary">Voltar</Button>
      </Section>
    );
  }

  function renderTechnicianHome() {
    return (
      <div style={styles.homeLayout}>
        <Section>
          <SectionHeader
            eyebrow="Operação"
            title="Área do técnico"
            description="Acesse rapidamente os clientes, consulte equipamentos do cliente e registre novas O.S. sem entrar no painel administrativo."
          />
        </Section>

        <div style={styles.actionGrid}>
          <ActionCard
            eyebrow="Clientes"
            title="Base de atendimento"
            description="Consulte clientes, confira dados de atendimento e registre novos cadastros quando necessário em campo."
            icon={<BuildingIcon />}
            accent="linear-gradient(135deg, rgba(29,185,84,0.18), rgba(29,185,84,0.02))"
            actions={[
              { label: "Listar", onClick: () => openView("listarClientes"), variant: "secondary" },
              { label: "Cadastrar", onClick: () => openView("criarCliente"), variant: "primary" },
            ]}
          />

          <ActionCard
            eyebrow="Extintores"
            title="Gestao de equipamentos"
            description="Consulte equipamentos e cadastre novos extintores quando houver instalacao ou ampliacao no cliente."
            icon={<ShieldIcon />}
            accent="linear-gradient(135deg, rgba(15,23,42,0.10), rgba(15,23,42,0.02))"
            actions={[
              { label: "Novo Extintor", onClick: () => openView("criarExtintor"), variant: "primary" },
              { label: "Listar", onClick: () => openView("listarExtintores"), variant: "secondary" },
            ]}
          />

          <ActionCard
            eyebrow="Inspeções"
            title="Execução de O.S."
            description="Registre novas inspeções, acompanhe serviços já lançados e mantenha seu fluxo operacional organizado."
            icon={<ClipboardIcon />}
            accent="linear-gradient(135deg, rgba(29,185,84,0.14), rgba(15,23,42,0.04))"
            actions={[
              { label: "Nova OS", onClick: () => { setOsSelecionada(null); openView("novaOS"); }, variant: "primary" },
              { label: "Listar", onClick: () => { setOsSelecionada(null); openView("listarOS"); }, variant: "secondary" },
            ]}
          />

          <ActionCard
            eyebrow="RTM"
            title="Manutenção técnica"
            description="Registre o RTM do extintor e acompanhe o histórico técnico separado do cadastro base."
            icon={<ClipboardIcon />}
            accent="linear-gradient(135deg, rgba(15,23,42,0.12), rgba(29,185,84,0.04))"
            actions={[
              { label: "Novo RTM", onClick: () => { setRtmSelecionado(null); openView("novoRTM"); }, variant: "primary" },
              { label: "Listar", onClick: () => { setRtmSelecionado(null); openView("listarRTM"); }, variant: "secondary" },
            ]}
          />
        </div>
      </div>
    );
  }

  function handleTechnicianCreated() {
    setTechnicianRefreshToken((prev) => prev + 1);
  }

  function renderAdminHome() {
    return (
      <div style={styles.homeLayout}>
        <div style={styles.topActionBar}>
          <button style={styles.topActionSecondary} onClick={() => openView("criarCliente")}>Novo Cliente</button>
          <button style={styles.topActionSecondary} onClick={() => openView("criarExtintor")}>Novo Extintor</button>
          <button style={styles.topActionPrimary} onClick={() => openView("tecnicos")}>Cadastrar Tecnico</button>
        </div>

        <DashboardOverview />
        <AdminTodayAgenda companyId={profile?.company_id || ""} />

        <div style={styles.actionGrid}>
          <ActionCard
            eyebrow="Clientes"
            title="Base comercial"
            description="Cadastre empresas, revise dados e mantenha o relacionamento operacional organizado."
            icon={<BuildingIcon />}
            accent="linear-gradient(135deg, rgba(29,185,84,0.18), rgba(29,185,84,0.02))"
            actions={[
              { label: "Listar", onClick: () => openView("listarClientes"), variant: "secondary" },
              { label: "Criar novo", onClick: () => openView("criarCliente"), variant: "primary" },
            ]}
          />

          <ActionCard
            eyebrow="Extintores"
            title="Parque de equipamentos"
            description="Acompanhe patrimônios, localizações e cadastre novos equipamentos com consistência."
            icon={<ShieldIcon />}
            accent="linear-gradient(135deg, rgba(15,23,42,0.10), rgba(15,23,42,0.02))"
            actions={[
              { label: "Listar", onClick: () => openView("listarExtintores"), variant: "secondary" },
              { label: "Cadastrar", onClick: () => openView("criarExtintor"), variant: "primary" },
            ]}
          />

          <ActionCard
            eyebrow="Inspeções"
            title="Rotina operacional"
            description="Abra novas O.S., consulte inspeções existentes e gere relatórios mensais com poucos cliques."
            icon={<ClipboardIcon />}
            accent="linear-gradient(135deg, rgba(29,185,84,0.14), rgba(15,23,42,0.04))"
            actions={[
              { label: "Nova OS", onClick: () => { setOsSelecionada(null); openView("novaOS"); }, variant: "primary" },
              { label: "Listar", onClick: () => { setOsSelecionada(null); openView("listarOS"); }, variant: "secondary" },
              { label: "Relatório", onClick: () => openView("relatorioMensal"), variant: "ghost" },
            ]}
          />

          <ActionCard
            eyebrow="RTM"
            title="Histórico técnico"
            description="Cadastre manutenções técnicas vinculadas aos extintores e consulte os RTMs gerados pela operação."
            icon={<ClipboardIcon />}
            accent="linear-gradient(135deg, rgba(15,23,42,0.12), rgba(29,185,84,0.04))"
            actions={[
              { label: "Novo RTM", onClick: () => { setRtmSelecionado(null); openView("novoRTM"); }, variant: "primary" },
              { label: "Listar", onClick: () => { setRtmSelecionado(null); openView("listarRTM"); }, variant: "secondary" },
            ]}
          />
        </div>
      </div>
    );
  }

  function renderContent() {
    if (view === "listarClientes") {
      if (clienteSelecionado) {
        return (
          <Section>
            <ClienteFicha
              key={clienteSelecionado.id}
              cliente={clienteSelecionado}
              isAdmin={isAdmin}
              onClose={() => setClienteSelecionado(null)}
              onUpdate={() => {
                setClienteSelecionado(null);
                openView("listarClientes");
              }}
            />
            <Button onClick={goHome} variant="secondary">Voltar</Button>
          </Section>
        );
      }

      return (
        <Section>
          <SectionHeader
            eyebrow="Cadastro"
            title="Listagem de Clientes"
            description="Acompanhe os clientes cadastrados e acesse a ficha completa com um clique."
          />
          <ClienteList
            onSelect={setClienteSelecionado}
            onEdit={setClienteSelecionado}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "criarCliente") {
      return (
        <Section>
          <SectionHeader
            eyebrow="Novo cadastro"
            title="Cadastro de Cliente"
            description="Cadastre o cliente com uma experiência mais guiada e pronta para a operação."
          />
          <ClienteForm
            onSuccess={() => openView("listarClientes")}
            onCancel={goHome}
          />
        </Section>
      );
    }

    if (view === "criarExtintor") {
      return (
        <Section>
          <SectionHeader
            eyebrow="Equipamentos"
            title="Cadastro de Extintor"
            description="Mantenha o parque de extintores organizado com dados claros e consistentes."
          />
          <ExtintorForm
            onSuccess={() => openView("listarExtintores")}
            onCancel={goHome}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "novaOS") {
      return (
        <Section>
          <SectionHeader
            eyebrow="Operação"
            title="Nova OS / Inspeção"
            description="Registre uma nova inspeção e mantenha o histórico operacional atualizado."
          />
          <OSForm
            onSuccess={() => {
              setOsSelecionada(null);
              openView("listarOS");
            }}
            onCancel={goHome}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "novoRTM") {
      return (
        <Section>
          <SectionHeader
            eyebrow="RTM"
            title="Novo RTM / Manutenção técnica"
            description="Registre a manutenção técnica do extintor preservando o histórico separado do cadastro base."
          />
          <RTMForm
            onSuccess={() => {
              setRtmSelecionado(null);
              openView("listarRTM");
            }}
            onCancel={goHome}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "tecnicos") {
      if (!isAdmin) {
        return renderAccessRestricted(
          "Gestao de tecnicos disponivel apenas para admin",
          "Somente o perfil administrador pode cadastrar e consultar tecnicos da empresa.",
        );
      }

      return (
        <Section>
          <SectionHeader
            eyebrow="Equipe"
            title="Cadastro de Tecnicos"
            description="Cadastre tecnicos da empresa, mantenha a equipe atualizada e acompanhe a lista completa em um unico lugar."
          />
          <div style={styles.managementStack}>
            <TechnicianForm
              companyId={profile?.company_id || ""}
              onSuccess={handleTechnicianCreated}
              onCancel={goHome}
            />
            <TechnicianList
              companyId={profile?.company_id || ""}
              refreshToken={technicianRefreshToken}
            />
          </div>
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "listarExtintores") {
      if (extintorSelecionado) {
        return (
          <Section>
            <ExtintorFicha
              extintor={extintorSelecionado}
              onClose={() => setExtintorSelecionado(null)}
              onUpdate={() => {
                setExtintorSelecionado(null);
                openView("listarExtintores");
              }}
            />
            <Button onClick={goHome} variant="secondary">Voltar</Button>
          </Section>
        );
      }

      return (
        <Section>
          <SectionHeader
            eyebrow="Equipamentos"
            title="Listagem de Extintores"
            description="Consulte os equipamentos cadastrados e abra fichas para edição sempre que precisar."
          />
          <ExtintorList
            onSelect={setExtintorSelecionado}
            onEdit={setExtintorSelecionado}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "relatorioMensal") {
      if (!isAdmin) {
        return renderAccessRestricted(
          "Relatórios disponíveis apenas para admin",
          "O perfil técnico segue focado na operação. Os relatórios mensais e indicadores administrativos ficam concentrados na gestão.",
        );
      }

      return (
        <Section>
          <SectionHeader
            eyebrow="Relatórios"
            title="Relatório mensal"
            description="Consolide indicadores, detalhe inspeções e gere PDFs em um único fluxo."
          />
          <MonthlyReport />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "listarOS") {
      if (osSelecionada) {
        return (
          <Section>
            <OSFicha
              inspection={osSelecionada}
              onClose={() => setOsSelecionada(null)}
              onUpdate={() => {
                setOsSelecionada(null);
                openView("listarOS");
              }}
            />
            <Button onClick={goHome} variant="secondary">Voltar</Button>
          </Section>
        );
      }

      return (
        <Section>
          <SectionHeader
            eyebrow="Operação"
            title="Listagem de OS / Inspeções"
            description="Pesquise rapidamente as ordens de serviço e acesse a edição sem sair do fluxo."
          />
          <OSList
            onSelect={setOsSelecionada}
            onEdit={setOsSelecionada}
            isAdmin={isAdmin}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    if (view === "listarRTM") {
      if (rtmSelecionado) {
        return (
          <Section>
            <RTMFicha
              report={rtmSelecionado}
              onClose={() => setRtmSelecionado(null)}
              onUpdate={() => {
                setRtmSelecionado(null);
                openView("listarRTM");
              }}
            />
            <Button onClick={goHome} variant="secondary">Voltar</Button>
          </Section>
        );
      }

      return (
        <Section>
          <SectionHeader
            eyebrow="RTM"
            title="Listagem de RTMs"
            description="Consulte os relatórios técnicos de manutenção e abra a ficha completa sempre que precisar."
          />
          <RTMList
            onSelect={setRtmSelecionado}
            onEdit={setRtmSelecionado}
            isAdmin={isAdmin}
          />
          <Button onClick={goHome} variant="secondary">Voltar</Button>
        </Section>
      );
    }

    return isAdmin ? renderAdminHome() : renderTechnicianHome();
  }

  return (
    <div style={styles.fullContainer}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.brandBar}>
        <div style={styles.brandMark}>E</div>
        <div>
          <h1 style={styles.brandTitle}>ExtintorIA</h1>
          <span style={styles.brandSubtitle}>Gestão inteligente de inspeções e clientes</span>
        </div>
      </div>

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.headerCopy}>
            <span style={styles.kicker}>{isAdmin ? "Dashboard" : "Operação"}</span>
            <h2 style={styles.title}>Painel do Sistema</h2>
            <p style={styles.subtitle}>
              {isAdmin
                ? "Visão central da operação com indicadores, acessos rápidos e acompanhamento do mês."
                : "Ambiente operacional para execução de inspeções, consulta de clientes e acompanhamento das O.S. do técnico."}
            </p>
          </div>

          <div style={styles.userArea}>
            <div style={styles.userCard}>
              <div style={styles.userAvatar}>{(user?.email || "U").slice(0, 1).toUpperCase()}</div>
              <div>
                <div style={styles.userLabel}>{roleLabel}</div>
                <div style={styles.userEmail}>{user?.email}</div>
              </div>
            </div>

            <button onClick={onLogout} style={styles.buttonLogout}>
              <LogoutIcon />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <main style={styles.main}>{renderContent()}</main>
      </div>
    </div>
  );
}

function Section({ children }) {
  return <section style={styles.section}>{children}</section>;
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div style={styles.sectionHeader}>
      <span style={styles.sectionEyebrow}>{eyebrow}</span>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.sectionDescription}>{description}</p>
    </div>
  );
}

function Button({ children, variant = "primary", ...props }) {
  return (
    <button
      style={{
        ...styles.buttonBase,
        ...(variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary),
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function ActionCard({ eyebrow, title, description, icon, accent, actions }) {
  return (
    <section style={{ ...styles.actionCard, backgroundImage: accent }}>
      <div style={styles.actionCardTop}>
        <div style={styles.actionIconWrap}>{icon}</div>
      </div>

      <div style={styles.actionContent}>
        <h3 style={styles.actionTitle}>{eyebrow}</h3>
        <span style={styles.actionLabel}>{title}</span>
        <p style={styles.actionDescription}>{description}</p>
      </div>

      <div style={styles.actionButtons}>
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            style={{
              ...styles.actionButtonBase,
              ...(action.variant === "primary"
                ? styles.actionButtonPrimary
                : action.variant === "ghost"
                  ? styles.actionButtonGhost
                  : styles.actionButtonSecondary),
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">
      <path d="M4 20V6.5C4 5.67 4.67 5 5.5 5H10v15H4Zm10 0V3.5c0-.83.67-1.5 1.5-1.5h3C19.33 2 20 2.67 20 3.5V20h-6ZM7 8h1.5v1.5H7V8Zm0 3h1.5v1.5H7V11Zm0 3h1.5v1.5H7V14Zm10-8h1.5v1.5H17V6Zm0 3h1.5v1.5H17V9Zm0 3h1.5v1.5H17V12Zm-4 8v-4h2v4h-2Z" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">
      <path d="M12 2 5 5v6c0 5.25 3.4 10.16 7 11 3.6-.84 7-5.75 7-11V5l-7-3Zm0 3.18 4 1.71v4.2c0 3.98-2.33 7.6-4 8.73-1.67-1.13-4-4.75-4-8.73v-4.2l4-1.71Z" fill="currentColor" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">
      <path d="M9 3h6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v11.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2-2Zm0 2v1h6V5H9Zm-4 2v11.5c0 .28.22.5.5.5h13a.5.5 0 0 0 .5-.5V7h-2v1a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7H5Zm3 5h8v2H8v-2Zm0 4h5v2H8v-2Z" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" style={styles.logoutIcon} aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H6V6h4V4Zm6.59 4.59L18.17 10H9v2h9.17l-1.58 1.41L18 15l4-4-4-4-1.41 1.59Z" fill="currentColor" />
    </svg>
  );
}

const styles = {
  fullContainer: {
    minHeight: "100vh",
    width: "100%",
    background: "radial-gradient(circle at top left, rgba(29,185,84,0.18), transparent 28%), linear-gradient(180deg, #071224 0%, #0B1730 42%, #0F172A 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 18px 40px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },

  backgroundGlowTop: {
    position: "absolute",
    top: "-120px",
    right: "-80px",
    width: "300px",
    height: "300px",
    borderRadius: "999px",
    background: "radial-gradient(circle, rgba(29,185,84,0.28), rgba(29,185,84,0))",
    pointerEvents: "none",
  },

  backgroundGlowBottom: {
    position: "absolute",
    bottom: "-120px",
    left: "-60px",
    width: "260px",
    height: "260px",
    borderRadius: "999px",
    background: "radial-gradient(circle, rgba(255,255,255,0.10), rgba(255,255,255,0))",
    pointerEvents: "none",
  },

  brandBar: {
    width: "100%",
    maxWidth: "1220px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
    position: "relative",
    zIndex: 1,
  },

  brandMark: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #1DB954 0%, #0ea84a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: "24px",
    fontWeight: "800",
    boxShadow: "0 16px 30px rgba(29,185,84,0.28)",
  },

  brandTitle: {
    color: "#F8FAFC",
    fontWeight: 700,
    fontSize: "1.6rem",
    margin: 0,
    letterSpacing: "-0.03em",
  },

  brandSubtitle: {
    color: "rgba(226,232,240,0.84)",
    fontSize: "0.98rem",
  },

  shell: {
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    boxShadow: "0 30px 80px rgba(2, 6, 23, 0.42)",
    border: "1px solid rgba(226,232,240,0.75)",
    backdropFilter: "blur(12px)",
    padding: "28px",
    maxWidth: "1220px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    paddingBottom: "20px",
    borderBottom: "1px solid rgba(226,232,240,0.95)",
  },

  headerCopy: {
    maxWidth: "640px",
  },

  kicker: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(29,185,84,0.12)",
    color: "#12803f",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "14px",
  },

  title: {
    color: "#0F172A",
    fontWeight: 800,
    fontSize: "2.35rem",
    lineHeight: 1.05,
    margin: 0,
    letterSpacing: "-0.04em",
  },

  subtitle: {
    color: "#475569",
    fontWeight: 500,
    fontSize: "1rem",
    lineHeight: 1.65,
    margin: "12px 0 0 0",
    textAlign: "left",
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
    border: "1px solid #E2E8F0",
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
    minWidth: "240px",
  },

  userAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #1DB954 0%, #13a046 100%)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "18px",
    boxShadow: "0 12px 20px rgba(29,185,84,0.22)",
  },

  userLabel: {
    fontSize: "12px",
    color: "#64748B",
    marginBottom: "2px",
  },

  userEmail: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0F172A",
    wordBreak: "break-all",
  },

  buttonLogout: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "13px 18px",
    border: "1px solid rgba(239,68,68,0.20)",
    borderRadius: "16px",
    background: "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)",
    color: "#be123c",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(244,63,94,0.12)",
  },

  logoutIcon: {
    width: "18px",
    height: "18px",
  },

  managementStack: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  topActionBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "4px",
  },

  topActionPrimary: {
    border: "none",
    background: "linear-gradient(135deg, #1DB954 0%, #169c47 100%)",
    color: "#FFFFFF",
    borderRadius: "14px",
    padding: "13px 18px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(29,185,84,0.22)",
  },

  topActionSecondary: {
    border: "1px solid rgba(226,232,240,0.95)",
    background: "rgba(255,255,255,0.92)",
    color: "#0F172A",
    borderRadius: "14px",
    padding: "13px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },

  main: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },

  homeLayout: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    width: "100%",
  },

  section: {
    background: "linear-gradient(180deg, #FFFFFF 0%, #FCFDFE 100%)",
    borderRadius: "24px",
    boxShadow: "0 20px 45px rgba(15,23,42,0.08)",
    border: "1px solid rgba(226,232,240,0.9)",
    padding: "26px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    alignItems: "flex-start",
    width: "100%",
    boxSizing: "border-box",
  },

  sectionHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxWidth: "720px",
  },

  sectionEyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#16A34A",
  },

  sectionTitle: {
    fontSize: "1.45rem",
    fontWeight: "800",
    color: "#0F172A",
    margin: 0,
    letterSpacing: "-0.03em",
  },

  sectionDescription: {
    fontSize: "14px",
    color: "#64748B",
    lineHeight: 1.6,
    margin: 0,
  },

  actionCard: {
    borderRadius: "24px",
    padding: "22px",
    border: "1px solid rgba(226,232,240,0.95)",
    boxShadow: "0 18px 38px rgba(15,23,42,0.08)",
    backgroundColor: "#FFFFFF",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    minHeight: "250px",
  },

  actionCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  actionIconWrap: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(226,232,240,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0F172A",
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  },

  icon: {
    width: "24px",
    height: "24px",
  },

  actionEyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  actionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  actionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  actionTitle: {
    margin: 0,
    fontSize: "1.42rem",
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: "-0.03em",
  },

  actionDescription: {
    margin: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.65,
  },

  actionButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "auto",
  },

  actionButtonBase: {
    minHeight: "44px",
    padding: "12px 16px",
    borderRadius: "14px",
    border: "1px solid transparent",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
  },

  actionButtonPrimary: {
    background: "linear-gradient(135deg, #1DB954 0%, #169c47 100%)",
    color: "#FFFFFF",
    boxShadow: "0 12px 24px rgba(29,185,84,0.22)",
  },

  actionButtonSecondary: {
    background: "#FFFFFF",
    color: "#0F172A",
    borderColor: "#D7E0EA",
    boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
  },

  actionButtonGhost: {
    background: "rgba(15,23,42,0.06)",
    color: "#0F172A",
  },

  buttonBase: {
    minHeight: "46px",
    padding: "12px 18px",
    border: "1px solid transparent",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
  },

  buttonPrimary: {
    background: "linear-gradient(135deg, #1DB954 0%, #159447 100%)",
    color: "#FFFFFF",
    boxShadow: "0 14px 26px rgba(29,185,84,0.22)",
  },

  buttonSecondary: {
    background: "#FFFFFF",
    color: "#0F172A",
    borderColor: "#D7E0EA",
    boxShadow: "0 10px 18px rgba(15,23,42,0.06)",
  },
};


