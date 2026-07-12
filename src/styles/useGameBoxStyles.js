const gameBoxStyles = {
  card: (theme) => ({
    margin: "8px",
    width: 580,
    height: 175,
    backgroundImage: "none",
    borderRadius: "10px",
    display: "flex",
    boxShadow: "none",
    transition: "transform 150ms ease, box-shadow 150ms ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
    },
    [theme.breakpoints.down("mobileCard")]: {
      margin: "4px",
      width: "100%",
      minWidth: "320px",
      height: "150px",
    },
  }),
  cardMedia: (theme) => ({
    maxWidth: 120,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    [theme.breakpoints.down("sm")]: {
      maxWidth: 100,
    },
  }),
  cardContent: (theme) => ({
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
    width: "100%",
    "&:last-child": { paddingBottom: "16px" },
    [theme.breakpoints.down("mobileCard")]: {
      padding: "8px",
      alignItems: "center",
      justifyContent: "space-around",
      "&:last-child": {
        paddingBottom: "8px",
      },
    },
  }),
  title: (theme) => ({
    color: "white",
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
    [theme.breakpoints.down("mobileCard")]: {
      fontSize: 16,
    },
  }),
  streamInfo: (theme) => ({
    width: "100%",
    display: "flex",
    textAlign: "center",
    justifyContent: "center",
    [theme.breakpoints.down("mobileCard")]: {
      marginLeft: 0,
    },
    [theme.breakpoints.between("mobileCard", "sm")]: {
      width: "auto",
      marginLeft: "8px",
      flexBasis: "70%",
    },
  }),
  tagBox: (theme) => ({
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    [theme.breakpoints.down("mobileCard")]: {
      width: "100%",
      marginLeft: 0,
      justifyContent: "center",
    },
    [theme.breakpoints.between("mobileCard", "sm")]: {
      width: "auto",
      marginLeft: "8px",
      flexBasis: "70%",
    },
  }),
  tags: {
    marginLeft: "8px",
    justifyContent: "flex-start",
    overflowX: "scroll",
    msOverflowStyle: "none",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  youtube: (theme) => ({
    display: "flex",
    justifyContent: "center",
    flexBasis: "33.3333%",
    fontSize: 55,
    color: "#ffffff",
    cursor: "pointer",
    transition: "text-shadow 120ms ease",
    "&:hover": {
      textShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
    },
    [theme.breakpoints.down("mobileCard")]: {
      fontSize: 40,
    },
  }),
  streamsHover: {
    transition: "text-shadow 120ms ease, transform 120ms ease",
    "&:hover": {
      textShadow: "0 0 5px rgba(220, 220, 255, 0.9)",
    },
  },
};

export default gameBoxStyles;
