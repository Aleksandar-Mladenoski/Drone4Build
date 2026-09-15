# Gameplay recovery: vertical-slice review

Run `npm run hub` and open the local address printed by Vite. The hub links to the four slices in standalone and mock-SCORM modes. This phase ends with human gameplay review; final SCORM packaging, localisation completeness, and production documentation are deferred.

| Slice | Review play path |
| --- | --- |
| M1.1 Hangar Zero | Inspect and orbit the physical aircraft. Click its low battery to read the indicator state, then run the starting test. Return to the same bench, drag the charged battery and RGB camera into their illuminated 3D mounts, and retest. Check detachment, incompatible-mount rejection, zoom, camera reset, successful replay, and whether the interaction feels physical. |
| M1.2 Live Shift | Pick either approach route, launch, use W/A/S/D to fly and Q/E to change altitude. C cycles chase, FPV, and orbit cameras; H toggles hover. Hold nearly still inside each turquoise inspection ring, watch the crane begin operating, go around its marked zone, then return low and slow to the gold pad and press L. Check both route orders and the site map. |
| M2.2 Thermal Investigator | Switch RGB, thermal, and split modes; click to aim, drag to pan, zoom, and change viewpoint. Capture the persistent warm wall seam from two viewpoints. Compare the glazed bay from two viewpoints, reject a likely reflection, and file the evidence. |
| M3.2 Reality Merge | Drag the survey layer and amber rotation ring until all three site controls converge. Sweep the clip and adjust opacity, then click the shifted existing opening rather than the planned outline. |

Local browser checks completed during recovery: M1.1 failed build → rebuild → six successful captures; M2.2 viewpoint/capture/classification → 90% report; M3.2 translation/rotation → registration → shifted opening found; M1.2 launch, camera switch, movement response, and timed crane activation. The full M1.2 flight route and landing remain priority human playtest items because the browser automation could not sustain directional key holds long enough to fly the entire site.

The original `drone-arcade.zip` remains unchanged. See `apps/m1-2-site-mission-control/PROTOTYPE-COMPARISON.md` for M1.2 prototype provenance and design tradeoffs.
