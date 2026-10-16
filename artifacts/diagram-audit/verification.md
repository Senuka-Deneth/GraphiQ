# Diagram generation and editor verification

Verified 16 October 2026.

## Requested behavior

| Requirement | Implementation and evidence |
| --- | --- |
| Reduce overlaps and improve readability | Render computed ELK routes; reroute missing, stale, diagonal, or obstructed routes using absolute node geometry; size text-bearing nodes from their content; leave room for labels; fit generated diagrams. Geometry assertions cover the seven-component storefront, nested coordinates, and obstacle avoidance. |
| Correct component notation | Provided lollipops and required sockets have external stems. Their full labels occupy reserved space outside component bodies. Assemblies terminate at interface symbols. Ports sit on borders. See [component diagram](component-diagram.png) and [editor](component-editor.png). |
| Labeled liquid-glass controls | Visible labels on shape/connector tiles, document actions, delete controls, and export controls. Right-rail buttons expand on hover and keyboard focus. Shared translucent fill, rim, shadow, and transitions; reduced-motion support. The rail lives outside the clipped canvas. |
| Submit and Clear | Editing and uploading only change the editor draft. Submit generates; Clear empties the draft and keeps the generated diagram. Invalid uploads remain editable with diagnostics. Browser assertions verify no generation before Submit. |
| Detect diagram kind | Submit uses the existing GraphiQ header extraction/import pipeline, independent of the selected kind. Browser coverage submits fixtures for all 14 kinds starting from the default class diagram. |
| Smaller screens | Browser checks at 390 and 768 pixels verify panel bounds, action buttons, separate rail controls, and reduced motion. See [390px](responsive-390.png), [768px](responsive-768.png). |

## Diagram audit

Each supported diagram kind was generated from its repository fixture and captured in a real Chrome browser. The notation review found and corrected the following issues; existing semantics were retained where no defect was found.

| Kind | Corrections / checks | Evidence |
| --- | --- | --- |
| Class | Content-based widths and compartment heights; routed connectors; association-end multiplicities. | [Class](class-order-domain.png) |
| Object | Instance and slot widths; underlined instance labels and link notation retained. | [Object](object-checkout.png) |
| Package | Name sizing; import/merge keywords retained alongside custom labels. | [Package](package-system.png) |
| Component | External provided/required interfaces, stems, nontruncated labels, border ports, modern component glyph, fixed attachment points and routes. | [Component](component-diagram.png) |
| Deployment | Reserved header space prevents artifacts covering device names; artifact document glyph and dependency keywords. | [Deployment](deployment-prod.png) |
| Profile | Attribute/literal widths; extension triangle and metaclass labels checked. | [Profile](profile-java.png) |
| Use case | Wider gaps preserve include/extend labels and arrowheads; connectors attach at actor symbols. | [Use case](usecase-storefront.png) |
| Composite structure | Part labels measured with type and multiplicity; ports may straddle borders rather than being clamped inside. | [Composite](compositeStructure-car.png) |
| Communication | Relationship-aware gaps leave space for numbered messages; message arrow conventions retained. | [Communication](communication-checkout.png) |
| Activity | Global vertical ordering across swimlanes; obstacle-aware routes; rectangular object nodes distinct from rounded actions. | [Activity](activity-fulfill-order.png) |
| State machine | Junction is a filled circle; exit point has a cross; choice remains a diamond. Transition labels and final state checked. | [State machine](state-machine-order-lifecycle.png) |
| Sequence | Declaration order; long-name/message spacing; self-call loops; solid fragment frame, guard text and dashed operand separators; self-call space reserved in frames. Create messages end at the head boundary; destruction messages draw an X and terminate the lifeline. | [Sequence](sequence-checkout.png), [alternatives and self-call](sequence-alternatives.png) |
| Timing | Existing interval and message notation checked; consistent labeled glass zoom/delete controls and diagnostic arrow paint. | [Timing](timing-lamp.png) |
| Interaction overview | Reference names rendered above the frame SVG; name-aware sizing; initial/final/control-flow notation checked. | [Interaction overview](interaction-overview-order-flow.png) |

Notation references: [OMG UML specification](https://www.omg.org/spec/UML/2.5.1), [OMG provided/required interface notation clarification](https://issues.omg.org/issues/UML25-513).

## Validation

- Workspace unit suite: 304 tests passed. New regressions cover connector obstacles, nested coordinates, label positions, keywords, multiplicities, component geometry, and cross-swimlane ordering.
- Full browser suite: 73 tests passed; subsequent affected browser suites passed after final routing, spacing, and export-control changes (24 tests). A further sequence regression was added and the four sequence browser checks passed, including frame/operand guard separation and self-call geometry.
- Workspace typecheck passed; final production build passed. Existing Vite bundle-size and mixed static/dynamic import warnings remain non-blocking.
- SVG, PNG, and PDF export browser tests passed.
- `git diff --check` passed.

This verifies the supported fixture corpus and the reconstructed seven-component example. Dense arbitrary graphs or deliberately crowded manual placements can still have connector crossings; custom straight/Bezier routing remains a user choice. Draft code is local to the editor until submitted; generated documents continue to autosave.
