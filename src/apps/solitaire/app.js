function initSolitaire(container) {
  let lastCard = 51;
  let ace = 0;
  let moves = 0;
  let cardsDealt = 0;
  let seconds = 0;
  let handsPlayed = 0;
  let handsWon = 0;
  let dropArray = [];
  let toDeal = [];
  let timer;
  let newCardBlock;
  let newCardFlipBlock;

  function clearGlobal() {
    clearInterval(timer);
    lastCard = 51;
    ace = 0;
    moves = 0;
    cardsDealt = 0;
    seconds = 0;
    dropArray = [];
    toDeal = [];
  }

  let gameContainer = document.createElement("div");
  gameContainer.id = "container";
  container.append(gameContainer);

  let gameArea = document.createElement("div");
  gameArea.id = "gameArea";
  gameContainer.append(gameArea);

  let scoreArea = document.createElement("div");
  scoreArea.id = "scoreArea";
  gameContainer.append(scoreArea);

  let scoreBlockTime = document.createElement("div");
  scoreBlockTime.className = "scoreBlock";
  scoreArea.append(scoreBlockTime);

  let scoreValueTime = document.createElement("span");
  scoreValueTime.className = "scoreValue";
  scoreValueTime.innerText = "0:00";
  scoreBlockTime.append(scoreValueTime);

  let scoreBlockMoves = document.createElement("div");
  scoreBlockMoves.className = "scoreBlock";
  scoreArea.append(scoreBlockMoves);

  let scoreValueMoves = document.createElement("span");
  scoreValueMoves.className = "scoreValue";
  scoreValueMoves.innerText = moves + " moves";
  scoreBlockMoves.append(scoreValueMoves);

  window.gameStart = function () {
    clearGlobal();
    shuffleCards(1, cards);
    handsPlayed++;

    for (let i = 28; i < cards.length; i++) {
      toDeal[i] = cards[i];
    }
    gameArea.innerHTML = "";

    let gameAreaSpan = document.createElement("span");
    gameAreaSpan.id = "gameAreaSpan";
    gameAreaSpan.innerText = "Press D to deal again";
    gameArea.append(gameAreaSpan);

    newCardBlock = document.createElement("div");
    newCardBlock.className = "cardBlockNewClick cardHidden";
    gameArea.append(newCardBlock);

    newCardFlipBlock = document.createElement("div");
    newCardFlipBlock.className = "cardBlockFlip";
    gameArea.append(newCardFlipBlock);

    newCardBlock.addEventListener("click", function () {
      dealCards(0, newCardFlipBlock);
      increaseMoves();
    });

    let blankBlock = document.createElement("div");
    blankBlock.className = "blankBlock";
    gameArea.append(blankBlock);

    for (let i = 0; i < 4; i++) {
      let aceBlock = document.createElement("div");
      aceBlock.className = "cardBlockAce";
      aceBlock.addEventListener("drop", function () {
        aceDrop(event);
      });
      aceBlock.addEventListener("dragover", function () {
        allowDrop(event);
      });
      gameArea.append(aceBlock);
    }

    let divider = document.createElement("div");
    gameArea.append(divider);

    for (let i = 0; i < 7; i++) {
      let playBlock = document.createElement("div");
      playBlock.className = "cardBlock";
      playBlock.addEventListener("drop", function () {
        drop(event);
      });
      playBlock.addEventListener("dragover", function () {
        allowDrop(event);
      });
      gameArea.append(playBlock);

      dealCards(i, playBlock);
    }

    scoreValueTime.innerText = "0:00";
    scoreValueMoves.innerText = moves + " moves";
  };

  window.gameStart();

  function displayModel() {
    let shadowBack = document.createElement("div");
    shadowBack.id = "shadowBack";
    gameArea.append(shadowBack);

    let model = document.createElement("div");
    model.id = "model";
    shadowBack.append(model);

    let modelConent = document.createElement("div");
    modelConent.id = "modelConent";
    model.append(modelConent);

    let modelSpan = document.createElement("span");
    modelSpan.id = "modelSpan";
    modelSpan.innerText = "Congratulations, you won!";
    modelConent.append(modelSpan);

    let modelScoreBlock = document.createElement("div");
    modelScoreBlock.id = "modelScoreBlock";
    modelConent.append(modelScoreBlock);

    let playedSpan = document.createElement("span");
    playedSpan.className = "scoreSpan";
    playedSpan.innerText = "Hands played: " + handsPlayed;
    modelScoreBlock.append(playedSpan);

    let wonSpan = document.createElement("span");
    wonSpan.className = "scoreSpan";
    wonSpan.innerText = "Hands won: " + handsWon;
    modelScoreBlock.append(wonSpan);

    let modelBtn = document.createElement("btn");
    modelBtn.id = "modelBtn";
    modelBtn.innerText = "Play again";
    modelBtn.addEventListener("click", function () {
      fadeOut(shadowBack, 500);
      setTimeout(function () {
        gameStart();
      }, 200);
    });
    modelConent.append(modelBtn);
    setTimeout(function () {
      shadowBack.style.cssText = "opacity:1";
    }, 1);
  }

  function fadeIn(el, time) {
    el.style.cssText = "opacity:1";
    setTimeout(function () {
      el.removeAttribute("style");
    }, time);
  }

  function fadeOut(el, time) {
    el.style.cssText = "opacity:0;";
    setTimeout(function () {
      el.innerHTML = "";
    }, time);
  }

  function allowDrop(ev) {
    ev.preventDefault();
  }

  function drag(ev) {
    dropArray = [];
    ev.dataTransfer.setData("card", ev.target.id);
    dropArray.push(ev.target.id);
    let cardBlockParent = ev.target.closest(".cardBlock");
    if (cardBlockParent != null) {
      let cardsEl = cardBlockParent.getElementsByClassName("card");
      let cardPos = Array.from(ev.target.parentNode.children).indexOf(
        ev.target
      );
      for (let i = cardPos + 1; i < cardsEl.length; i++) {
        dropArray.push(cardsEl[i].id);
      }
    }
  }

  function aceDrop(ev) {
    let data = ev.dataTransfer.getData("card");
    let element = document.getElementById(data);
    let parent = element.closest(".cardBlock");
    if (document.getElementById(data).hasAttribute("deal-card")) {
      element.removeAttribute("deal-card");
      let cardId = element.getAttribute("data-id");
      toDeal[cardId] = null;
    }
    if (ev.target.className != "cardBlockAce") {
      let cardBlockParent = ev.target.closest(".cardBlockAce");
      let currentFace = element.getAttribute("data-face");
      let currentSuit = element.getAttribute("data-suit");
      let cardsEl = cardBlockParent.getElementsByClassName("card");
      let dropSuit = cardsEl[cardsEl.length - 1].getAttribute("data-suit");

      if (currentSuit == dropSuit) {
        let currentFacePos = cardPosition(currentFace, 1) - 1;
        let dropFacePos = cardPosition(
          cardsEl[cardsEl.length - 1].getAttribute("data-face"),
          1
        );
        if (currentFacePos == dropFacePos) {
          element.className = "card";
          cardBlockParent.append(element);
          increaseMoves();
          if (parent !== null) {
            let cardCount = parent.getElementsByClassName("card");
            if (cardCount.length > 0) {
              cardCount[cardCount.length - 1].classList.remove("cardHidden");
              cardCount[cardCount.length - 1].setAttribute("draggable", true);
            }
          }
          checkWin();
        }
      }
    } else {
      if (element.getAttribute("data-face") == "A") {
        element.className = "card";
        ev.target.appendChild(element);
        increaseMoves();
        if (parent != null) {
          let cardCount = parent.getElementsByClassName("card");
          if (cardCount.length > 0) {
            cardCount[cardCount.length - 1].classList.remove("cardHidden");
            cardCount[cardCount.length - 1].setAttribute("draggable", true);
          }
        }
      }
    }
  }

  function drop(ev) {
    for (let i = 0; i < dropArray.length; i++) {
      let data = dropArray[i];
      let element = document.getElementById(data);
      let parent = element.closest(".cardBlock");
      let face = element.getAttribute("data-face");
      if (element.hasAttribute("deal-card")) {
        element.removeAttribute("deal-card");
        let cardId = element.getAttribute("data-id");
        toDeal[cardId] = null;
      }
      if (ev.target.className == "cardBlock" && face == "K") {
        element.className =
          "card topClass" +
          ev.target.getElementsByClassName("card").length +
          1;
        ev.target.appendChild(element);
        if (parent != null) {
          let cardCount = parent.getElementsByClassName("card");
          if (cardCount.length > 0) {
            cardCount[cardCount.length - 1].classList.remove("cardHidden");
            cardCount[cardCount.length - 1].setAttribute("draggable", true);
          }
        }
      }
      let cardBlockParent = ev.target.closest(".cardBlock");
      let currentSuit = element.getAttribute("data-suit");
      let cardsEl = cardBlockParent.getElementsByClassName("card");
      let dropSuit = cardsEl[cardsEl.length - 1]
        ? cardsEl[cardsEl.length - 1].getAttribute("data-suit")
        : "blank";

      if (
        ((currentSuit == "heart" || currentSuit == "diamond") &&
          (dropSuit == "spade" || dropSuit == "clubs")) ||
        ((currentSuit == "spade" || currentSuit == "clubs") &&
          (dropSuit == "heart" || dropSuit == "diamond"))
      ) {
        let currentFacePos = cardPosition(face, 0) + 1;
        let dropFacePos = cardPosition(
          cardsEl[cardsEl.length - 1].getAttribute("data-face"),
          0
        );
        if (currentFacePos == dropFacePos) {
          element.setAttribute("temp", true);
          element.className =
            "card topClass" +
            (ev.target.closest(".cardBlock").getElementsByClassName("card")
              .length +
              1);
          cardBlockParent.append(element);

          if (parent != null) {
            let cardCount = parent.getElementsByClassName("card");
            if (cardCount.length > 0) {
              cardCount[cardCount.length - 1].classList.remove("cardHidden");
              cardCount[cardCount.length - 1].setAttribute("draggable", true);
            }
          }
        }
      }

      ev.preventDefault();
    }

    increaseMoves();
  }

  function checkWin() {
    let aceBlock = document.getElementsByClassName("cardBlockAce");
    for (let i = 0; i < aceBlock.length; i++) {
      let card = aceBlock[i].getElementsByClassName("card");
      if (card.length == 13) {
        ace++;
      } else {
        return (ace = 0);
      }
    }

    if (ace == 4) {
      return gameWin();
    }
  }

  function gameWin() {
    clearInterval(timer);
    handsWon++;

    let aceBlock = document.getElementsByClassName("cardBlockAce");
    for (let i = 0; i < aceBlock.length; i++) {
      let card = aceBlock[i].getElementsByClassName("card");
      for (let j = 0; j < card.length; j++) {
        let counter = 500 * j;
        let maxTime = 500 * card.length + 500;
        setTimeout(function () {
          card[j].style.cssText = "top: 457px; left -436px";
        }, counter);
        setTimeout(function () {
          card[j].removeAttribute("style");
        }, maxTime);
      }
    }

    setTimeout(function () {
      displayModel();
    }, 7000);
  }

  function increaseMoves() {
    moves++;
    document.getElementsByClassName("scoreValue")[1].innerText =
      moves + " moves";
    if (moves == 1) {
      startTimer();
    }
  }

  function timerConvert(ms) {
    let minutes = Math.floor(ms / 60000);
    let seconds = ((ms % 60000) / 1000).toFixed(0);
    return seconds == 60
      ? minutes + 1 + ":00"
      : minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  function startTimer() {
    timer = setInterval(function () {
      seconds = seconds + 1000;
      document.getElementsByClassName("scoreValue")[0].innerText =
        timerConvert(seconds);
    }, 1000);
  }

  function checkDealt(count) {
    if (toDeal[cardsDealt] == null) {
      cardsDealt++;

      if (cardsDealt > lastCard) {
        newCardFlipBlock.innerHTML = "";
        newCardBlock.innerHTML = "";
        newCardBlock.className = "cardBlockNewClick cardHidden";
        cardsDealt = 28;
      }

      count++;
      if (count == 30) {
        lastCard = 0;
        return false;
      }

      checkDealt(count);
    }
  }

  function dealCards(count, playBlock) {
    if (cardsDealt > lastCard) {
      newCardFlipBlock.innerHTML = "";
      newCardBlock.innerHTML = "";
      newCardBlock.className = "cardBlockNewClick cardHidden";
      cardsDealt = 28;
    }

    let deal = cardsDealt > 27 ? toDeal : cards;

    if (cardsDealt > 27) {
      checkDealt(1);
    }

    if (lastCard != 0) {
      for (let i = 1; i <= count + 1; i++) {
        let viewClass = cardsDealt < 28 ? " cardHidden" : "";
        let colourClass =
          deal[cardsDealt].suit == "heart" || deal[cardsDealt].suit == "diamond"
            ? " red"
            : " black";
        let topClass = i > 1 ? " topClass" + i : "";
        let card = document.createElement("div");
        card.className = "card" + topClass + viewClass;
        card.id = deal[cardsDealt].suit + deal[cardsDealt].face;
        card.setAttribute("data-id", cardsDealt);
        card.setAttribute("data-face", deal[cardsDealt].face);
        card.setAttribute("data-suit", deal[cardsDealt].suit);
        if (cardsDealt > 27) {
          card.setAttribute("draggable", true);
          card.setAttribute("deal-card", true);
        }
        card.addEventListener("dragstart", function () {
          drag(event);
        });
        playBlock.append(card);

        let numberTop = document.createElement("div");
        numberTop.className = "number-top" + colourClass;
        numberTop.innerText = deal[cardsDealt].face;
        card.append(numberTop);

        let suitTop = document.createElement("div");
        suitTop.className = "suit-top";
        card.append(suitTop);

        let suitTopEl = document.createElement("div");
        suitTopEl.className = deal[cardsDealt].suit;
        suitTop.append(suitTopEl);

        let suitCentre = document.createElement("div");
        suitCentre.className = "suit-centre";
        card.append(suitCentre);

        if (
          deal[cardsDealt].face != "J" &&
          deal[cardsDealt].face != "Q" &&
          deal[cardsDealt].face != "K" &&
          deal[cardsDealt].face != "A"
        ) {
          for (let k = 0; k < parseInt(deal[cardsDealt].face); k++) {
            let suitEl = document.createElement("div");
            suitEl.className =
              deal[cardsDealt].suit +
              " " +
              deal[cardsDealt].suitClass +
              "-" +
              suitCentreClasses[k];
            suitCentre.append(suitEl);
          }
        } else {
          let suitEl = document.createElement("div");
          suitEl.className =
            deal[cardsDealt].suitClass +
            " " +
            deal[cardsDealt].suitCentreClass;
          suitEl.innerText = deal[cardsDealt].face;
          suitCentre.append(suitEl);
        }

        let numberBottom = document.createElement("div");
        numberBottom.className = "number-bottom";
        numberBottom.innerText = deal[cardsDealt].face;
        card.append(numberBottom);

        let suitBottom = document.createElement("div");
        suitBottom.className = "suit-bottom";
        card.append(suitBottom);

        let suitBottomEl = document.createElement("div");
        suitBottomEl.className = deal[cardsDealt].suit;
        suitBottom.append(suitBottomEl);

        cardsDealt++;
        if (cardsDealt == 28) {
          let cardBlocks = document.getElementsByClassName("cardBlock");
          for (let i = 0; i < cardBlocks.length; i++) {
            let cardsEl = cardBlocks[i].getElementsByClassName("card");
            cardsEl[cardsEl.length - 1].classList.remove("cardHidden");
            cardsEl[cardsEl.length - 1].setAttribute("draggable", true);
          }
        }

        for (let j = 0; j < cards.length; j++) {
          if (toDeal[j] != null) {
            lastCard = j;
          }
        }

        if (cardsDealt > lastCard) {
          newCardBlock.className = "cardBlockNewClick";
          let span = document.createElement("span");
          span.className = "ncbSpan";
          span.innerText = "0";
          newCardBlock.append(span);
        }
      }
    } else {
      newCardBlock.innerHTML = "";
      newCardBlock.className = "cardBlockNewClick";
      let span = document.createElement("span");
      span.className = "ncbSpanClose";
      span.innerText = "X";
      newCardBlock.append(span);
      newCardBlock.removeEventListener("click", function () {
        dealCards(0, newCardFlipBlock);
        increaseMoves();
      });
    }
  }
}
