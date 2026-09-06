import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './Home.jsx';
import Tournament from './Tournament.jsx';
import Admin from './Admin.jsx';
import Register from './Register.jsx';

describe('Frontend professionnel - nettoyage messages dev', () => {
  it('Home sans user ne montre pas de credentials démo', () => {
    render(<Home players={[]} onNav={() => {}} user={null} league={null} />);
    expect(screen.queryByText(/demo@example.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Compte de test/)).not.toBeInTheDocument();
    expect(screen.getByText(/Connecte-toi pour créer un match/)).toBeInTheDocument();
  });

  it('Home avec user montre bouton Feedback pro (Donner mon avis) pas dev-only', () => {
    const user = { pseudo: 'alice', poste: 'Attaque', niveau: 'Débutant' };
    render(<Home players={[]} onNav={() => {}} user={user} league={null} />);
    expect(screen.getByText(/Donner mon avis/)).toBeInTheDocument();
    expect(screen.queryByText(/bug \/ idée/)).not.toBeInTheDocument();
  });

  it('Tournament pro : pas de En chantier / v0.9 / 35%', () => {
    render(<Tournament onBack={() => {}} />);
    expect(screen.queryByText(/En chantier/)).not.toBeInTheDocument();
    expect(screen.queryByText(/v0\.9/)).not.toBeInTheDocument();
    expect(screen.queryByText(/35%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/maquettes prêtes/)).not.toBeInTheDocument();
    expect(screen.getByText('Tournoi')).toBeInTheDocument();
    expect(screen.getByText(/Disponible prochainement/)).toBeInTheDocument();
    expect(screen.getByText(/Au programme/)).toBeInTheDocument();
    expect(screen.getByText(/format coupe/)).toBeInTheDocument();
  });

  it('Admin non-admin ne montre pas admin@example.com', () => {
    render(<Admin user={{ role: 'user' }} onBack={() => {}} />);
    expect(screen.queryByText(/admin@example.com/)).not.toBeInTheDocument();
    expect(screen.getByText(/Accès restreint/)).toBeInTheDocument();
    expect(screen.getByText(/compte administrateur/)).toBeInTheDocument();
  });

  it('Register ne contient pas de Token (dev) en dur', () => {
    const html = Register.toString();
    expect(html).not.toContain('Token vérif (dev)');
  });
});
