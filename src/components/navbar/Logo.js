import { Box, Link, Typography, useTheme } from "@mui/material";
import logo from "../../images/logo.png";

const Logo = () => {
  const theme = useTheme();

  return (
    <Link
      href="."
      underline="none"
      alignItems="center"
      display={"flex"}
    >
      <img src={logo} height={50} style={{borderRadius: '9000px'}}alt="logo" />
      <Box marginLeft={2} display={{ xs: "none", sm: "block" }}>
        <Typography fontSize={25} fontWeight={700}>
          tsunami's twitch vods
        </Typography>
        <Typography
          fontSize={12}
          fontWeight={500}
          color={theme.palette.text.primary}
        >
          A catalog of games played on stream
        </Typography>
      </Box>
    </Link>
  );
};

export default Logo;
