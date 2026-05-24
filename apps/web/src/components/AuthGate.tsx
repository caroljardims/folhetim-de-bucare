type Props = {
  onCreateAccount: () => void;
  onSignIn: () => void;
};

export function AuthGate({ onCreateAccount, onSignIn }: Props) {
  return (
    <div className="page page--auth-gate">
      <div className="auth-gate-card">
        <div className="auth-gate-icon" aria-hidden>
          🔒
        </div>
        <h1 className="auth-gate-title">Esta área é para jogadores com conta em Bucaré.</h1>
        <p className="auth-gate-lead copy-muted">
          Crie uma conta para acessar seu histórico, pontuação e o ranking da cidade.
        </p>
        <div className="auth-gate-actions">
          <button type="button" className="primary-btn auth-gate-btn" onClick={onCreateAccount}>
            Criar conta
          </button>
          <button type="button" className="ghost-btn auth-gate-btn" onClick={onSignIn}>
            Já tenho conta — entrar
          </button>
          <button type="button" className="auth-gate-back" onClick={() => window.history.back()}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
