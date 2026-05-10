LoadEverything().then(() => {

  gsap.config({ nullTargetWarn: false, trialWarn: false });

  // Entrance animation — open-curtain from center, matching SSBTR style
  let startingAnimation = gsap.timeline({ paused: true, delay: 0.8 })
    .from(".banner-frame", {
      duration: 0.3,
      clipPath: "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)",
      ease: "power2.inOut"
    }, 0)
    .from(".bounty-ticker", {
      duration: 0.3,
      scaleX: 0,
      ease: "power2.inOut",
      transformOrigin: "center center"
    }, 0);

  Start = async () => {
    startingAnimation.restart();
  };

  Update = async (event) => {
    const data = event.data;
    const score = data.score[window.scoreboardNumber];

    const isDoubles = Object.keys(score.team["1"].player).length > 1;

    // ── Per-team updates ──────────────────────────────────────────
    for (const [t, team] of [score.team["1"], score.team["2"]].entries()) {
      const pNum = t + 1; // 1 or 2

      // Score
      SetInnerHtml($(`.p${pNum}.player-side .score`), String(team.score));

      if (!isDoubles) {
        // ── Singles ──
        const player = team.player["1"];

        // Seed
        SetInnerHtml(
          $(`.p${pNum}.player-side .seed`),
          player.seed ? `SEED #${String(player.seed).padStart(2, '0')}` : ""
        );

        // Name + losers
        const lTag = "<span class='losers'>[L]</span>";
        SetInnerHtml(
          $(`.p${pNum}.player-side .player_info`),
          `${t === 0 && team.losers ? lTag : ""}
           <div class="player_name">${await Transcript(player.name)}</div>
           ${t === 1 && team.losers ? lTag : ""}`
        );

        // Flags
        SetInnerHtml(
          $(`.p${pNum}.player-side .flagcountry`),
          player.country && player.country.asset
            ? `<div class="flag" style="background-image:url('../../${player.country.asset.toLowerCase()}')"></div>`
            : ""
        );
        SetInnerHtml(
          $(`.p${pNum}.player-side .flagstate`),
          player.state && player.state.asset
            ? `<div class="flag" style="background-image:url('../../${player.state.asset}')"></div>`
            : ""
        );

        // Twitter
        SetInnerHtml(
          $(`.p${pNum}.player-side .twitter`),
          player.twitter
            ? `<span class="twitter_logo"></span>${String(player.twitter)}`
            : ""
        );

        // Sponsor
        SetInnerHtml(
          $(`.p${pNum}.player-side .sponsor-container`),
          player.sponsor_logo
            ? `<div style="background-image:url('../../${player.sponsor_logo}')"></div>`
            : ""
        );

      } else {
        // ── Doubles ──
        const names = [];
        for (const player of Object.values(team.player)) {
          if (player && player.name) {
            names.push(await Transcript(player.name));
          }
        }
        const joined = names.join(" / ");
        const displayName = (team.teamName && team.teamName !== "")
          ? await Transcript(team.teamName)
          : joined;

        SetInnerHtml($(`.p${pNum}.player-side .seed`), "");

        const lTag = "<span class='losers'>[L]</span>";
        const nameEl = `<div class="player_name team_names">${displayName}</div>`;
        const parts = t === 0
          ? [team.losers ? lTag : "", nameEl]
          : [nameEl, team.losers ? lTag : ""];
        SetInnerHtml($(`.p${pNum}.player-side .player_info`), parts.join(""));

        // Clear individual player info in doubles
        SetInnerHtml($(`.p${pNum}.player-side .flagcountry`), "");
        SetInnerHtml($(`.p${pNum}.player-side .flagstate`), "");
        SetInnerHtml($(`.p${pNum}.player-side .twitter`), "");
        SetInnerHtml($(`.p${pNum}.player-side .sponsor-container`), "");
      }

      // Character display (works for both singles and doubles)
      const teamMult = t === 0 ? 1 : -1;
      await CharacterDisplay(
        $(`.p${pNum}.character_container`),
        {
          source: `score.${window.scoreboardNumber}.team.${pNum}`,
          anim_out: {
            autoAlpha: 0,
            x: (-20 * teamMult) + "px",
            stagger: teamMult * 0.2,
            duration: 0.4
          },
          anim_in: {
            autoAlpha: 1,
            x: "0px",
            stagger: teamMult * 0.2,
            duration: 0.4
          }
        },
        event
      );

      // Team color override
      if (team.color && !tsh_settings["forceDefaultScoreColors"]) {
        document.documentElement.style.setProperty(`--p${pNum}-score-bg-color`, team.color);
      }

      // ── Bounty system ─────────────────────────────────────────
      // bounty_active + bounty_amount on player["1"]; all else hidden by default.
      const player1 = team.player["1"] || {};
      const bountyActive = !!player1.bounty_active;
      const bountyAmount = player1.bounty_amount != null ? player1.bounty_amount : 50;

      const $side = $(`.p${pNum}.player-side`);

      $side.find(".wanted-stamp").toggleClass("active", bountyActive);
      $side.find(".portrait-scan-sweep").toggleClass("active", bountyActive);
      $side.toggleClass("bounty-active", bountyActive);

      if (bountyActive) {
        $side.find(".bounty-amount").text(`$${bountyAmount}`);
      }
    }

    // ── Center column ─────────────────────────────────────────────
    const tournamentLabel = data.tournamentInfo
      ? (data.tournamentInfo.tournamentName || "")
      : "";
    SetInnerHtml($(".tournament_name"), tournamentLabel);
    SetInnerHtml($(".match"), score.match || "");
    SetInnerHtml(
      $(".best_of"),
      score.best_of_text ? `Best of ${score.best_of_text}` : ""
    );

    // ── Bounty ticker ─────────────────────────────────────────────
    const t1 = score.team["1"].player["1"] || {};
    const t2 = score.team["2"].player["1"] || {};
    const p1Wanted = !!t1.bounty_active;
    const p2Wanted = !!t2.bounty_active;

    const wantedNames = [
      p1Wanted ? (score.team["1"].player["1"].name || "") : null,
      p2Wanted ? (score.team["2"].player["1"].name || "") : null,
    ].filter(Boolean);

    if (wantedNames.length > 0) {
      const amount = (t1.bounty_amount || t2.bounty_amount || 50);
      const segment = wantedNames
        .map(n => `◆ WANTED · ${n.toUpperCase()} · $${amount} BOUNTY ON THEIR HEAD`)
        .join('  ·  ');
      // Duplicate text for seamless CSS marquee loop
      $(".ticker-text").text(segment + "    ");
      $(".bounty-ticker").addClass("active");
    } else {
      $(".bounty-ticker").removeClass("active");
    }
  };

});
