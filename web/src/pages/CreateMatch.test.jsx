import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateMatch from './CreateMatch.jsx';

const players = [
  { id: 1, pseudo: 'alice', poste: 'Attaque' },
  { id: 2, pseudo: 'bob', poste: 'Défense' },
  { id: 3, pseudo: 'carol', poste: 'Attaque' },
  { id: 4, pseudo: 'dave', poste: 'Défense' },
];

const ligueA = { id: 1, name: 'Boulot - Étage 3', slug: 'boulot-etage-3', is_private: 1 };
const ligueB = { id: 2, name: 'Amis', slug: 'amis', is_private: 0 };

describe('CreateMatch – contexte ligue', () => {
  it('affiche bandeau ligue active (mono-ligue)', () => {
    render(<CreateMatch players={players} leagueId={1} leagues={[ligueA]} league={ligueA} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Boulot - Étage 3')).toBeInTheDocument();
    expect(screen.getByText(/boulot-etage-3/)).toBeInTheDocument();
    expect(screen.getByText(/Le match sera enregistré dans cette ligue/)).toBeInTheDocument();
    // pas de sélecteur si 1 seule ligue
    expect(screen.queryByText('Changer de ligue')).not.toBeInTheDocument();
  });

  it('affiche warning quand aucune ligue sélectionnée', () => {
    render(<CreateMatch players={players} leagueId={null} leagues={[]} onDone={vi.fn()} onBack={vi.fn()} onLeagues={vi.fn()} />);
    expect(screen.getByText('Aucune ligue sélectionnée')).toBeInTheDocument();
    expect(screen.getByText(/Choisis une ligue pour créer le match/)).toBeInTheDocument();
  });

  it('affiche bouton Gérer et appelle onLeagues', () => {
    const onLeagues = vi.fn();
    render(<CreateMatch players={players} leagueId={1} leagues={[ligueA]} league={ligueA} onLeagues={onLeagues} onDone={vi.fn()} onBack={vi.fn()} />);
    const btn = screen.getByText('Gérer');
    fireEvent.click(btn);
    expect(onLeagues).toHaveBeenCalledTimes(1);
  });

  it('multi-ligues : affiche sélecteur et permet de changer', () => {
    const onLeagueChange = vi.fn();
    render(<CreateMatch players={players} leagueId={1} leagues={[ligueA, ligueB]} league={ligueA} onLeagueChange={onLeagueChange} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Changer de ligue')).toBeInTheDocument();
    const select = screen.getByDisplayValue('Boulot - Étage 3 · boulot-etage-3');
    expect(select).toBeInTheDocument();
    // options
    expect(screen.getByText('Amis · amis')).toBeInTheDocument();
    fireEvent.change(select, { target: { value: '2' } });
    expect(onLeagueChange).toHaveBeenCalledWith('2');
  });

  it('fallback ligues/ligue props (ancien naming) fonctionne', () => {
    render(<CreateMatch players={players} ligueId={1} ligues={[ligueA]} ligue={ligueA} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Boulot - Étage 3')).toBeInTheDocument();
  });

  it('affiche ligue via leaguesData.find quand prop league absente', () => {
    render(<CreateMatch players={players} leagueId={2} leagues={[ligueA, ligueB]} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Amis')).toBeInTheDocument();
  });
});
