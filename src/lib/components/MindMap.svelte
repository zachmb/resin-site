<script lang="ts">
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap,
    } from "@xyflow/svelte";
    import "@xyflow/svelte/dist/style.css";
    import { onMount, untrack } from "svelte";
    import { fade } from "svelte/transition";
    import MapNode from "./MapNode.svelte";

    const nodeTypes = { mapNode: MapNode };

    interface Props {
        notes?: any[];
        initialEdges?: any[];
        onNoteDropped?: () => void;
    }

    let { notes = [], initialEdges = [], onNoteDropped }: Props = $props();

    // Convert notes to Svelte Flow nodes
    let nodes = $state<any[]>([]);
    let edges = $state<any[]>([]);

    const handleNodeDelete = async (id: string) => {
        nodes = nodes.filter((n: any) => n.id !== id);  // optimistic remove
        const formData = new FormData();
        formData.append("id", id);
        try {
            await fetch("/map?/removeFromMap", { method: "POST", body: formData });
            if (onNoteDropped) onNoteDropped();
        } catch (err) {
            console.error("Failed to remove node:", err);
        }
    };

    $effect(() => {
        nodes = notes.map((note: any) => {
            // Find existing node tracking safely using untrack to prevent infinite loops
            const existing = untrack(() => nodes.find((n) => n.id === note.id));
            return {
                id: note.id,
                type: "mapNode",
                position: existing
                    ? existing.position
                    : {
                          x: note.position_x || Math.random() * 200,
                          y: note.position_y || Math.random() * 200,
                      },
                data: { label: note.title || "Untitled Note", onDelete: handleNodeDelete },
            };
        });

        edges = initialEdges.map((edge: any) => ({
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            style: "stroke: #2B4634; stroke-width: 2px;",
            animated: true,
        }));
    });

    let saveTimeout: ReturnType<typeof setTimeout>;
    let showConnectPanel = $state(false);
    let connectFrom = $state('');
    let connectTo = $state('');

    let isConnecting = $state(false);

    const handleManualConnect = async () => {
        if (connectFrom && connectTo && connectFrom !== connectTo) {
            isConnecting = true;
            try {
                await onConnect({ source: connectFrom, target: connectTo });
                // Reset form after successful connection
                connectFrom = '';
                connectTo = '';
            } finally {
                isConnecting = false;
            }
        }
    };

    const closePanel = () => {
        showConnectPanel = false;
        connectFrom = '';
        connectTo = '';
    };

    const onNodeDragStop = (event: any, node?: any, nodes?: any) => {
        if (!node) return;
        // Debounce saving position to DB
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const formData = new FormData();
            formData.append("id", node.id);
            formData.append("position_x", node.position.x.toString());
            formData.append("position_y", node.position.y.toString());

            try {
                await fetch("/map?/updateNodePosition", {
                    method: "POST",
                    body: formData,
                });
            } catch (error) {
                console.error("Failed to save node position:", error);
            }
        }, 500);
    };

    let wrapper: HTMLElement;
    let isSaving = $state(false);

    const saveConnections = async () => {
        isSaving = true;
        try {
            // Edges are already saved as they're created, this is just to confirm
            await new Promise(resolve => setTimeout(resolve, 300));
        } finally {
            isSaving = false;
        }
    };

    const onDragOver = (event: DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    };

    const onDrop = async (event: DragEvent) => {
        event.preventDefault();

        // Ensure we only process drops containing our SvelteFlow type
        const noteId = event.dataTransfer?.getData("application/svelteflow");
        if (!noteId || !wrapper) return;

        // Calculate drop position relative to the flow view
        const reactFlowBounds = wrapper.getBoundingClientRect();
        const position_x = event.clientX - reactFlowBounds.left;
        const position_y = event.clientY - reactFlowBounds.top;

        // Find all edges involving this note
        const relatedEdges = initialEdges.filter((edge: any) =>
            edge.source_id === noteId || edge.target_id === noteId
        );

        // Collect all connected note IDs (other endpoints)
        const connectedNoteIds = new Set<string>();
        for (const edge of relatedEdges) {
            if (edge.source_id === noteId) connectedNoteIds.add(edge.target_id);
            if (edge.target_id === noteId) connectedNoteIds.add(edge.source_id);
        }

        // Optimistically add the dropped note
        const newNodes = [
            {
                id: noteId,
                type: "mapNode",
                position: { x: position_x, y: position_y },
                data: { label: "Loading...", onDelete: handleNodeDelete },
            },
        ];

        // Optimistically add connected notes
        let minX = position_x;
        for (const connectedId of connectedNoteIds) {
            if (!nodes.some((n: any) => n.id === connectedId)) {
                minX -= 150;
                newNodes.push({
                    id: connectedId,
                    type: "mapNode",
                    position: { x: minX, y: position_y },
                    data: { label: "Loading...", onDelete: handleNodeDelete },
                });
            }
        }
        nodes = [...nodes, ...newNodes];

        // Add the related edges
        const newEdges = relatedEdges.map((edge: any) => ({
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            style: "stroke: #2B4634; stroke-width: 2px;",
            animated: true,
        }));
        edges = [...edges, ...newEdges];

        // Save positions to DB
        const formData = new FormData();
        formData.append("id", noteId);
        formData.append("position_x", position_x.toString());
        formData.append("position_y", position_y.toString());

        try {
            await fetch("/map?/updateNodePosition", {
                method: "POST",
                body: formData,
            });

            // Also add connected notes to map
            minX = position_x;
            for (const connectedId of connectedNoteIds) {
                if (newNodes.some((n: any) => n.id === connectedId)) {
                    minX -= 150;
                    const formData2 = new FormData();
                    formData2.append("id", connectedId);
                    formData2.append("position_x", minX.toString());
                    formData2.append("position_y", position_y.toString());
                    await fetch("/map?/updateNodePosition", {
                        method: "POST",
                        body: formData2,
                    });
                }
            }

            if (onNoteDropped) {
                onNoteDropped();
            }
        } catch (error) {
            console.error("Failed to add note to map:", error);
        }
    };

    const onConnect = async (params: any) => {
        // Optimistically add edge to UI
        const tempId = `temp-${Date.now()}`;
        edges = [
            ...edges,
            {
                id: tempId,
                source: params.source,
                target: params.target,
                style: "stroke: #2B4634; stroke-width: 2px;",
                animated: true,
            },
        ];

        // Save edge to DB
        const formData = new FormData();
        formData.append("source_id", params.source);
        formData.append("target_id", params.target);

        try {
            const response = await fetch("/map?/createEdge", {
                method: "POST",
                body: formData,
            });
            const json = await response.json();
            const realEdge = json?.data?.edge;
            if (realEdge?.id) {
                edges = edges.map((e: any) => e.id === tempId ? { ...e, id: realEdge.id } : e);
            }
        } catch (error) {
            console.error("Failed to save edge:", error);
            // Revert on failure
            edges = edges.filter((e: any) => e.id !== tempId);
        }
    };

    const onDelete = async ({
        nodes: deletedNodes,
        edges: deletedEdges,
    }: any) => {
        // Handle edges
        for (const edge of deletedEdges) {
            const formData = new FormData();
            formData.append("id", edge.id);
            try {
                await fetch("/map?/deleteEdge", {
                    method: "POST",
                    body: formData,
                });
            } catch (error) {
                console.error("Failed to delete edge:", error);
            }
        }

        // Handle nodes removed from map (put them back in sidebar)
        for (const node of deletedNodes) {
            const formData = new FormData();
            formData.append("id", node.id);
            try {
                await fetch("/map?/removeFromMap", {
                    method: "POST",
                    body: formData,
                });
            } catch (error) {
                console.error("Failed to remove node from map:", error);
            }
        }

        if (deletedNodes.length > 0 && onNoteDropped) {
            // Resync unmapped/mapped notes
            setTimeout(() => onNoteDropped(), 100);
        }
    };

    const onNodeClick = (...args: any[]) => {
        // Can add click-to-open logic later if requested
    };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={wrapper}
    class="w-full h-full relative"
    in:fade={{ duration: 300 }}
    ondragover={onDragOver}
    ondrop={onDrop}
>
    <!-- Action Buttons -->
    <div class="absolute top-6 right-6 z-10 flex gap-2 items-center">
        <button
            onclick={saveConnections}
            disabled={isSaving}
            class="px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-resin-forest/20 text-resin-forest font-medium text-sm hover:bg-white hover:shadow-lg transition-all disabled:opacity-50 {isSaving ? 'animate-pulse' : ''}"
        >
            {isSaving ? '✓ Saving...' : '✓ Save'}
        </button>

        <form method="POST" action="/map?/clearMap" class="inline">
            <button
                type="submit"
                class="px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-red-200/50 text-red-600 font-medium text-sm hover:bg-white hover:shadow-lg transition-all"
            >
                Clear
            </button>
        </form>

        <button
            onclick={() => (showConnectPanel = true)}
            class="px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-resin-forest/20 text-resin-forest font-medium text-sm hover:bg-white hover:shadow-lg transition-all"
        >
            + Connect Notes
        </button>
    </div>

    <!-- Connect Panel -->
    {#if showConnectPanel}
        <div class="absolute top-16 right-6 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-80 border border-resin-forest/10">
            <h3 class="font-bold text-resin-charcoal mb-4">Connect Two Notes</h3>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-medium text-resin-earth/60 mb-2">From</label>
                    <select
                        bind:value={connectFrom}
                        class="w-full px-3 py-2 rounded-lg border border-resin-earth/20 bg-white/60 text-resin-charcoal focus:outline-none focus:border-resin-forest/50 focus:ring-2 focus:ring-resin-forest/10 text-sm"
                    >
                        <option value="">Select a note...</option>
                        {#each nodes as node (node.id)}
                            <option value={node.id}>{node.data.label}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-medium text-resin-earth/60 mb-2">To</label>
                    <select
                        bind:value={connectTo}
                        class="w-full px-3 py-2 rounded-lg border border-resin-earth/20 bg-white/60 text-resin-charcoal focus:outline-none focus:border-resin-forest/50 focus:ring-2 focus:ring-resin-forest/10 text-sm"
                    >
                        <option value="">Select a note...</option>
                        {#each nodes as node (node.id)}
                            <option value={node.id}>{node.data.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex gap-2 pt-2">
                    <button
                        onclick={handleManualConnect}
                        disabled={!connectFrom || !connectTo || connectFrom === connectTo || isConnecting}
                        class="flex-1 px-4 py-2 rounded-lg bg-resin-forest text-white font-medium text-sm hover:bg-resin-forest/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed {isConnecting ? 'animate-pulse' : ''}"
                    >
                        {isConnecting ? 'Adding...' : 'Add Connection'}
                    </button>
                    <button
                        type="button"
                        onclick={closePanel}
                        class="flex-1 px-4 py-2 rounded-lg border border-resin-earth/20 text-resin-charcoal font-medium text-sm hover:bg-resin-earth/5 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <SvelteFlow
        {nodes}
        {edges}
        {nodeTypes}
        onnodedragstop={onNodeDragStop}
        onconnect={onConnect}
        ondelete={onDelete}
        onnodeclick={onNodeClick}
        fitView
    >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} />
        <MiniMap />
    </SvelteFlow>
</div>

<style>
    /* Custom Svelte Flow Overrides */
    :global(.svelte-flow__panel) {
        margin: 20px;
    }
    :global(.svelte-flow__controls) {
        box-shadow:
            0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
        border: none;
        border-radius: 12px;
        overflow: hidden;
    }
    :global(.svelte-flow__controls-button) {
        border-bottom: 1px solid rgba(43, 70, 52, 0.1);
        background: #fcf9f2;
        color: #2b4634;
    }
    :global(.svelte-flow__controls-button:hover) {
        background: #f3ece1;
    }
</style>
