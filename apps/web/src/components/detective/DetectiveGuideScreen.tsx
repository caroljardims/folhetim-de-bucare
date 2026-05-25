import { closeDetectiveGuideToHome } from "../../lib/detectiveRoute.js";
import { DETECTIVE_LOCATION_GUIDE } from "../../lib/detectiveLocationGuide.js";

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
            No <strong>Modo História</strong>, sua primeira noite é uma ronda por toda Bucaré — impressões
            atmosféricas, sem acusações. A partir da segunda noite, você escolhe um lugar por noite. No{" "}
            <strong>Modo Investigação</strong>, cada noite funciona como uma investigação focada em um único local.
          </p>
          <p>
            Se o lugar estiver vazio, alguém estava agindo nas sombras. Se estiver ocupado, seus habitantes têm um
            alibi para aquela noite.
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

        <section className="detective-guide__places">
          <h2>Os lugares de Bucaré</h2>
          <p className="detective-guide__places-note">
            Nem todos estarão em Bucaré em cada partida. Mas os que estiverem, dormem onde sempre dormiram.
          </p>
          <ul className="detective-guide__places-list">
            {DETECTIVE_LOCATION_GUIDE.map((entry) => (
              <li key={entry.location} className="detective-guide__place">
                <h3 className="detective-guide__place-name">{entry.label}</h3>
                <p className="detective-guide__place-desc">&ldquo;{entry.description}&rdquo;</p>
                <p className="detective-guide__place-inhab">
                  <span className="detective-guide__place-inhab-label">Quem costuma estar por lá:</span>{" "}
                  {entry.inhabitantLabels.join(" · ")}
                </p>
              </li>
            ))}
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
