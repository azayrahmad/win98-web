class FoundationPile extends Pile {
  constructor() {
    super();
  }

  addSet(set) {
    // In Spider Solitaire, the foundation usually just holds one card (e.g., the King)
    // to represent the completed set.
    if (set && set.length > 0) {
      this.addCard(set[0]); // Add the King (the first card of the completed set)
    }
  }
}
