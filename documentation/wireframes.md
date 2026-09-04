# Wireframes — App Babyfoot au boulot

Wireframes texte des écrans principaux, mobile-first.

---

## 1. Inscription

```
┌─────────────────────────────┐
│ Rejoindre le babyfoot        │
│ Inscris-toi pour jouer.      │
│                               │
│ Pseudo                       │
│ [ ex. pierre_j            ]  │
│                               │
│ Poste préféré                │
│ [ Défense ] [Attaque*] [Les 2]│
│                               │
│ Niveau de départ             │
│ [ Débutant ▾ ]                │
│                               │
│ [        S'inscrire        ] │
└─────────────────────────────┘
```

- Champs : pseudo (texte), poste préféré (3 choix), niveau de départ (liste)
- Le niveau reste modifiable plus tard depuis le profil

---

## 2. Accueil

```
┌─────────────────────────────┐
│ Babyfoot                     │
│                               │
│ [ + Créer un match          ]│
│ [   Voir les stats          ]│
│                               │
│ Joueurs inscrits             │
│ ┌───────────────────────────┐│
│ │ PJ  pierre_j  Attaque·Conf││
│ ├───────────────────────────┤│
│ │ SL  sarah_l   Défense·Int ││
│ ├───────────────────────────┤│
│ │ TM  tom_m     Les 2·Début ││
│ └───────────────────────────┘│
└─────────────────────────────┘
```

- Deux actions principales en avant (créer un match / stats)
- Liste des joueurs inscrits avec poste + niveau visibles d'un coup d'œil

---

## 3. Création de match

```
┌─────────────────────────────┐
│ Nouveau match                │
│                               │
│ [1 contre 1*] [2 contre 2]   │
│                               │
│ ● Équipe Bleue               │
│ [ pierre_j — Attaque ▾ ]     │
│                               │
│ ● Équipe Rouge               │
│ [ sarah_l — Défense ▾ ]      │
│                               │
│ Score final                  │
│ [ 10 ]   à   [ 7 ]           │
│                               │
│ [      Valider le match    ] │
└─────────────────────────────┘
```

- Toggle format 1v1 / 2v2 (en 2v2 : deux sélecteurs par équipe)
- Sélection joueur + poste par équipe
- Score libre, validation crée le match et met à jour les stats

---

## 4. Stats / Classement

```
┌─────────────────────────────┐
│ Classement                   │
│                               │
│ 1  sarah_l        8V · 2D    │
│ 2  pierre_j        6V · 4D   │
│ 3  tom_m            3V · 5D  │
│                               │
│ Derniers matchs               │
│ ┌───────────────────────────┐│
│ │ pierre_j vs sarah_l — 7-10 ││
│ └───────────────────────────┘│
└─────────────────────────────┘
```

- Classement trié par victoires (ou ratio)
- Liste des derniers matchs en dessous