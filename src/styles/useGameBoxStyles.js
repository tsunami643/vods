import { makeStyles } from "@mui/styles";

const useGameBoxStyles = makeStyles((theme) => ({
  card: {
    margin: 8,
    width: 580,
    height: 175,
    backgroundImage: "none",
    borderRadius: 10,
    display: "flex",
    boxShadow: "none",
    transition: "transform 150ms ease, box-shadow 150ms ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
    },
    [theme.breakpoints.down("mobileCard")]: {
      margin: 4,
      width: "100%",
      minWidth: "320px",
      height: "150px",
    },
  },
  cardMedia: {
    maxWidth: 120,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    [theme.breakpoints.down("sm")]: {
      maxWidth: 100,
    },
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
    width: "100%",
    "&:last-child": { paddingBottom: 16 },
    [theme.breakpoints.down("mobileCard")]: {
      padding: 8,
      alignItems: "center",
      justifyContent: "space-around",
      "&:last-child": {
        paddingBottom: 8,
      },
    },
  },
  title: {
    color: "white",
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
    [theme.breakpoints.down("mobileCard")]: {
      fontSize: 16,
    },
  },
  skeleton: {
    width: 130,
    [theme.breakpoints.down("mobileCard")]: {
      width: 80,
      height: 40,
    },
  },
  streamInfo: {
    width: "100%",
    display: "flex",
    textAlign: "center",
    justifyContent: "center",
    [theme.breakpoints.down("mobileCard")]: {
      marginLeft: 0,
    },
    [theme.breakpoints.between("mobileCard", "sm")]: {
      width: "auto",
      marginLeft: 8,
      flexBasis: "70%",
    },
  },
  tagBox: {
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
      marginLeft: 8,
      flexBasis: "70%",
    },
  },
  tags: {
    marginLeft: 8,
    overflowX: "scroll",
    msOverflowStyle: "none",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  youtube: {
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
  },
  streamsHover: {
    transition: "text-shadow 120ms ease, transform 120ms ease",
    "&:hover": {
      textShadow: "0 0 5px rgba(220, 220, 255, 0.9)",
    },
  },
}));

export default useGameBoxStyles;
