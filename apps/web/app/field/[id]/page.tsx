// THE WORKSPACE (§B.1, §C.3): chat (left) + live cards (right). The product, not a chatbot.
export default function FieldWorkspace({ params }: { params: { id: string } }) {
  return (
    <main>
      {/* TODO: <Rail/> · <IdentityStrip/> · <SeasonStrip/> · split: <Thread/> | <Tabs> cards */}
      <div>Field workspace: {params.id}</div>
    </main>
  );
}
