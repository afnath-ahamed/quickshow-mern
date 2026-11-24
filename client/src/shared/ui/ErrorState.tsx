export default function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div>
      <p role="alert">{message}</p>
      {retry && <button className="catalog-button catalog-button-secondary mt-4" onClick={retry} type="button">Try again</button>}
    </div>
  )
}
