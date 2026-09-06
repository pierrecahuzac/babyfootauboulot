import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerDetail from './PlayerDetail.jsx';
import Home from './Home.jsx';

const player = { id: 1, pseudo: 'alice', poste: 'Attaque', niveau: 'Débutant', created_at: '2026-01-15T10:00:00Z' };
const stats = [
  { id: 1, pseudo: 'alice', victoires: 3, defaites: 1, ratio: 75, total: 4 },
  { id: 2, pseudo: 'bob', victoires: 1, defaites: 3, ratio: 25, total: 4 },
];
const matches = [
  { id: 1, format: '1v1', team_bleue: [{ pseudo: 'alice' }], team_rouge: [{ pseudo: 'bob' }], score_bleue: 10, score_rouge: 7, created_at: '2026-09-01T12:00:00Z' },
  { id: 2, format: '2v2', team_bleue: [{ pseudo: 'alice' }, { pseudo: 'carol' }], team_rouge: [{ pseudo: 'bob' }, { pseudo: 'dave' }], score_bleue: 5, score_rouge: 10, created_at: '2026-09-02T12:00:00Z' },
  { id: 3, format: '1v1', team_bleue: [{ pseudo: 'carol' }], team_rouge: [{ pseudo: 'dave' }], score_bleue: 10, score_rouge: 8, created_at: '2026-09-03T12:00:00Z' },
];
const league = { id: 1, name: 'Boulot' };

describe('PlayerDetail', () => {
  it('affiche infos joueur sans email/mdp', () => {
    render(<PlayerDetail player={player} stats={stats} matches={matches} league={league} onBack={vi.fn()} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    // poste/niveau présents mais pas email
    expect(screen.getByText('Attaque')).toBeInTheDocument();
    expect(screen.getByText('Débutant')).toBeInTheDocument();
    expect(screen.queryByText(/@example/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mot de passe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/demo@example/)).not.toBeInTheDocument();
  });

  it('affiche stats V/D/ratio et rang', () => {
    render(<PlayerDetail player={player} stats={stats} matches={matches} onBack={vi.fn()} />);
    expect(screen.getByText('Victoires')).toBeInTheDocument();
    // victoires 3 et défaites 1
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('bouton Retour appelle onBack', () => {
    const onBack = vi.fn();
    render(<PlayerDetail player={player} stats={stats} matches={matches} onBack={onBack} />);
    fireEvent.click(screen.getByText('← Retour'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('filtre les matchs du joueur (2 sur 3)', () => {
    render(<PlayerDetail player={player} stats={stats} matches={matches} onBack={vi.fn()} />);
    // alice participe à 2 matchs, pas au 3e
    expect(screen.getByText(/alice \+ carol vs bob \+ dave/)).toBeInTheDocument();
    // le 3e match carol vs dave ne doit pas apparaître dans sa liste
    const allCards = screen.getAllByText(/vs/);
    // 2 cartes pour alice
    expect(allCards.length).toBe(2);
  });

  it('gère joueur introuvable', () => {
    render(<PlayerDetail player={null} onBack={vi.fn()} />);
    expect(screen.getByText(/Joueur introuvable/)).toBeInTheDocument();
  });

  it('Home rend joueurs cliquables', () => {
    const onPlayerSelect = vi.fn();
    const players = [player, { id: 2, pseudo: 'bob', poste: 'Défense', niveau: 'Intermédiaire' }];
    const user = { pseudo: 'alice' };
    render(<Home players={players} onNav={vi.fn()} user={user} league={league} onPlayerSelect={onPlayerSelect} />);
    const btn = screen.getByText('alice').closest('button');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onPlayerSelect).toHaveBeenCalledWith(expect.objectContaining({ pseudo: 'alice' }));
  });

  it('Leaderboard cliquable délègue au PlayerDetail (via players)', async () => {
    const LB = (await import('./Leaderboard.jsx')).default;
    const onPlayerSelect = vi.fn();
    render(<LB leaderboard={stats} players={[{ id: 1, pseudo: 'alice', poste: 'Attaque', niveau: 'Débutant' }]} onPlayerSelect={onPlayerSelect} />);
    fireEvent.click(screen.getByText('alice'));
    expect(onPlayerSelect).toHaveBeenCalledWith(expect.objectContaining({ pseudo: 'alice' }));
  });
});
