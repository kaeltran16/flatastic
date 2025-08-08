const LoadingScreenHTML = () => (
  <>
    <div id="initial-loader">
      <div className="loader-logo">Flatastic</div>
      <div className="loader-spinner"></div>
      <div className="loader-text">Loading your experience...</div>
    </div>

    <script
      dangerouslySetInnerHTML={{
        __html: `
          setTimeout(function() {
            const loader = document.getElementById('initial-loader');
            const content = document.getElementById('app-content');
            if (loader && content) {
              content.style.opacity = '1';
              loader.style.display = 'none';
            }
          }, 3000);
        `,
      }}
    />
  </>
);

export default LoadingScreenHTML;
