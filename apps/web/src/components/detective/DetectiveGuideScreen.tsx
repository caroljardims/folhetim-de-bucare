import { closeDetectiveGuideToHome } from "../../lib/detectiveRoute.js";

export function DetectiveGuideScreen() {
  return (
    <div className="page page--detective-guide">
      <header className="detective-guide__header">
        <button type="button" className="ghost-btn detective-guide__back" onClick={() => closeDetectiveGuideToHome()}>
          ← Voltar
        </button>
        <h1 className="detective-guide__title">O que Bucaré esconde</h1>
        <p className="detective-guide__subtitle">Um guia para quem sabe olhar</p>
      </header>

      <div className="detective-guide__body">
        <section>
          <h2>O jogo</h2>
          <p>
            As mesmas mecânicas do multiplayer — mas você investiga a todos. Criaturas e moradores.
          </p>
        </section>

        <section>
          <h2>As evidências (Modo História)</h2>
          <p>
            O caderno registra pistas automaticamente. Cada uma tem um peso — leve, moderada ou forte.
            Nenhuma é conclusiva sozinha.
          </p>
        </section>

        <section>
          <h2>Suas anotações (Modo Investigação)</h2>
          <p>Sem ajuda. O caderno é em branco. Você observa, você anota, você decide.</p>
        </section>

        <section>
          <h2>Rondas noturnas</h2>
          <p>
            A cada noite, você pode rondar um lugar em Bucaré. Se o lugar estiver vazio, alguém estava agindo nas
            sombras. Se estiver ocupado, seus habitantes têm um alibi para aquela noite. Alguns lugares têm mais de um
            habitante — nesses casos, a investigação exige mais paciência.
          </p>
        </section>

        <section>
          <h2>O que observar</h2>
          <ul>
            <li>Observe quem vota primeiro.</li>
            <li>Quem fala demais. Quem não fala nada.</li>
            <li>Quem defende quem — e quando.</li>
            <li>Os alibis do Folhetim nem sempre fecham.</li>
            <li>
              Cada habitante de Bucaré tem seus hábitos. Aprenda a reconhecê-los.
            </li>
          </ul>
        </section>

        <section>
          <h2>As classificações</h2>
          <dl className="detective-guide__ranks">
            <div>
              <dt>NOVATO</dt>
              <dd>Bucaré guardou seus segredos desta vez.</dd>
            </div>
            <div>
              <dt>INVESTIGADOR</dt>
              <dd>Você farejou o perigo — mas o folclore foi mais esperto.</dd>
            </div>
            <div>
              <dt>DETETIVE</dt>
              <dd>Impressionante. Bucaré tem poucos como você.</dd>
            </div>
            <div>
              <dt>LENDA</dt>
              <dd>A cidade pode dormir. Você viu o que ninguém mais viu.</dd>
            </div>
            <div>
              <dt>LENDA SEM REDE</dt>
              <dd>Distinção no Modo Investigação — você não precisou de ajuda.</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
