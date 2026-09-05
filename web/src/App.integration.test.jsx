import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App.jsx';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPlayers = [
  { id:1, pseudo:'pierre_j', poste:'Attaque', niveau:'Confirmé' },
  { id:2, pseudo:'sarah_l', poste:'Défense', niveau:'Intermédiaire' },
  { id:3, pseudo:'tom_m', poste:'Les 2', niveau:'Débutant' },
  { id:4, pseudo:'lucas', poste:'Attaque', niveau:'Débutant' },
];

const mockStats = {
  classement: [
    { id:1, pseudo:'pierre_j', victoires:2, defaites:1, ratio:67 },
    { id:2, pseudo:'sarah_l', victoires:1, defaites:1, ratio:50 },
  ],
  matches: [
    { id:1, team_bleue:[{pseudo:'pierre_j'}], team_rouge:[{pseudo:'sarah_l'}], score_bleue:10, score_rouge:7 },
  ]
};

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url) => {
    if (url.includes('/api/players')) return Promise.resolve({ ok:true, json: async()=> mockPlayers });
    if (url.includes('/api/stats')) return Promise.resolve({ ok:true, json: async()=> mockStats });
    if (url.includes('/api/ligues')) return Promise.resolve({ ok:true, json: async()=> [] });
    if (url.includes('/api/auth/me')) return Promise.resolve({ ok:true, json: async()=> ({ id:1, email:'pierre@example.com', pseudo:'pierre_j', poste:'Attaque', niveau:'Confirmé', role:'user', emailVerified:true }) });
    return Promise.resolve({ ok:true, json: async()=> ({}) });
  });
});

describe('App intégration', () => {
  it('affiche header et joueurs', async () => {
    render(<App />);
    expect(screen.getByText('BABYFOOT')).toBeInTheDocument();
    await waitFor(()=> expect(screen.getAllByText('pierre_j').length).toBeGreaterThan(0));
    expect(screen.getByText('sarah_l')).toBeInTheDocument();
  });

  it('navigation vers inscription (register + invité)', async () => {
    // part 1 : non connecté -> Créer compte depuis header
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/players')) return Promise.resolve({ ok:true, json: async()=> mockPlayers });
      if (url.includes('/api/stats')) return Promise.resolve({ ok:true, json: async()=> mockStats });
      if (url.includes('/api/ligues')) return Promise.resolve({ ok:true, json: async()=> [] });
      if (url.includes('/api/auth/me')) return Promise.resolve({ ok:false, status:401, json: async()=> ({ error:'non authentifié' }) });
      return Promise.resolve({ ok:true, json: async()=> ({}) });
    });
    const { unmount } = render(<App />);
    await waitFor(()=> expect(screen.getByText(/Connecte-toi pour voir les joueurs/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Créer compte/));
    expect(await screen.findByText('Créer ton compte')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retour/));
    unmount();
    // part 2 : connecté -> invité visible
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/players')) return Promise.resolve({ ok:true, json: async()=> mockPlayers });
      if (url.includes('/api/stats')) return Promise.resolve({ ok:true, json: async()=> mockStats });
      if (url.includes('/api/ligues')) return Promise.resolve({ ok:true, json: async()=> [] });
      if (url.includes('/api/auth/me')) return Promise.resolve({ ok:true, json: async()=> ({ id:1, email:'pierre@example.com', pseudo:'pierre_j', poste:'Attaque', niveau:'Confirmé', role:'user', emailVerified:true }) });
      return Promise.resolve({ ok:true, json: async()=> ({}) });
    });
    render(<App />);
    await waitFor(()=> expect(screen.getAllByText('pierre_j').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText(/Ajouter un joueur invité/));
    expect(await screen.findByText('Ajouter un invité')).toBeInTheDocument();
  });

  it('CreateMatch affiche équipes Bleue/Rouge et bouton random', async () => {
    render(<App />);
    await waitFor(()=> expect(screen.getAllByText('pierre_j').length).toBeGreaterThan(0));
    // click hero Créer un match
    fireEvent.click(screen.getByText(/Créer un match/));
    expect(await screen.findByText('Nouveau match')).toBeInTheDocument();
    expect(screen.getByText('Équipe Bleue')).toBeInTheDocument();
    expect(screen.getByText('Équipe Rouge')).toBeInTheDocument();
    expect(screen.getByText(/Tirage aléatoire/)).toBeInTheDocument();
    // random doit remplir selects
    fireEvent.click(screen.getByText(/Tirage aléatoire/));
    await waitFor(()=> {
      const selects = screen.getAllByDisplayValue(/pierre_j|sarah_l|tom_m|lucas/);
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  it('Stats affiche classement et matchs', async () => {
    render(<App />);
    await waitFor(()=> expect(screen.getAllByText('pierre_j').length).toBeGreaterThan(0));
    // bottom nav Stats - le dernier bouton Stats (nav)
    const statsBtn = screen.getAllByText('Stats').pop();
    fireEvent.click(statsBtn);
    expect(await screen.findByText('Classement')).toBeInTheDocument();
    await waitFor(()=> expect(screen.getByText(/2V.*1D/)).toBeInTheDocument());
  });
});
